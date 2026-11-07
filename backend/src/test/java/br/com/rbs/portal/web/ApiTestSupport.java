package br.com.rbs.portal.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Base dos testes de API: sobe o app com banco em memória (dados de demonstração do DataSeeder). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
abstract class ApiTestSupport {

    static final String RBS = "admin@rbs.com.br";
    static final String RBS_SENHA = "Admin@1234";
    static final String MASTER = "master@exemplo.com";
    static final String MASTER_SENHA = "Master@1234";
    static final String SUBG = "subg@exemplo.com";
    static final String SUBG_SENHA = "SubG@1234";
    static final String SUB = "sub@exemplo.com";
    static final String SUB_SENHA = "Sub@12345";

    @Autowired
    protected MockMvc mvc;
    @Autowired
    protected ObjectMapper om;

    protected String token(String email, String senha) throws Exception {
        String corpo = om.writeValueAsString(java.util.Map.of("email", email, "senha", senha));
        String res = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andReturn().getResponse().getContentAsString();
        return om.readTree(res).path("token").asText();
    }

    protected MockHttpServletRequestBuilder comToken(MockHttpServletRequestBuilder req, String token) {
        return req.header("Authorization", "Bearer " + token);
    }

    protected JsonNode json(String texto) throws Exception {
        return om.readTree(texto);
    }

    /** Id do patrocinador de demonstração cujo nome contém o texto (ex.: "Master"). */
    protected long idDe(String parteDoNome) throws Exception {
        String res = mvc.perform(comToken(get("/api/patrocinadores"), token(RBS, RBS_SENHA)))
                .andReturn().getResponse().getContentAsString();
        for (JsonNode n : om.readTree(res)) {
            if (n.path("nome").asText().contains(parteDoNome)) {
                return n.path("id").asLong();
            }
        }
        throw new IllegalStateException("Patrocinador não encontrado: " + parteDoNome);
    }
}
