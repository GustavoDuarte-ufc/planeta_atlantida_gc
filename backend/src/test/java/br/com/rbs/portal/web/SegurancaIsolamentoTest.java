package br.com.rbs.portal.web;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Garante as regras que protegem os dados: isolamento por patrocinador, abas da cota e perfis. */
class SegurancaIsolamentoTest extends ApiTestSupport {

    @Test
    void semTokenNaoEntra() throws Exception {
        mvc.perform(get("/api/patrocinadores")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/prazos")).andExpect(status().isUnauthorized());
    }

    @Test
    void tokenInvalidoNaoEntra() throws Exception {
        mvc.perform(get("/api/patrocinadores").header("Authorization", "Bearer lixo")).andExpect(status().isUnauthorized());
    }

    @Test
    void patrocinadorVeSomenteOProprio() throws Exception {
        String t = token(MASTER, MASTER_SENHA);
        var lista = json(mvc.perform(comToken(get("/api/patrocinadores"), t)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertThat(lista).hasSize(1);
        assertThat(lista.get(0).path("nome").asText()).contains("Master");
    }

    @Test
    void patrocinadorNaoAcessaOutroPatrocinador() throws Exception {
        String t = token(MASTER, MASTER_SENHA);
        long outro = idDe("Subcota (exemplo)");
        mvc.perform(comToken(get("/api/patrocinadores/" + outro), t)).andExpect(status().isForbidden());
        mvc.perform(comToken(get("/api/patrocinadores/" + outro + "/relatorio"), t)).andExpect(status().isForbidden());
        mvc.perform(comToken(get("/api/patrocinadores/" + outro + "/prazos"), t)).andExpect(status().isForbidden());
        mvc.perform(comToken(get("/api/patrocinadores/" + outro + "/contratos"), t)).andExpect(status().isForbidden());
    }

    @Test
    void rbsVeTodos() throws Exception {
        var lista = json(mvc.perform(comToken(get("/api/patrocinadores"), token(RBS, RBS_SENHA)))
                .andReturn().getResponse().getContentAsString());
        assertThat(lista.size()).isGreaterThanOrEqualTo(3);
    }

    @Test
    void abaForaDaCotaEBloqueada() throws Exception {
        // Subcota (básica) não inclui Cortesias
        String t = token(SUB, SUB_SENHA);
        long id = idDe("Subcota (exemplo)");
        mvc.perform(comToken(get("/api/patrocinadores/" + id + "/cortesias"), t)).andExpect(status().isForbidden());
    }

    @Test
    void patrocinadorNaoExecutaAcoesDaRbs() throws Exception {
        String t = token(MASTER, MASTER_SENHA);
        String corpo = om.writeValueAsString(Map.of("nome", "Invasora", "cota", "MASTER"));
        mvc.perform(comToken(post("/api/patrocinadores"), t).contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isForbidden());
        mvc.perform(comToken(get("/api/contratos/modelos"), t)).andExpect(status().isForbidden());
        mvc.perform(comToken(post("/api/alertas/executar"), t)).andExpect(status().isForbidden());
        mvc.perform(comToken(get("/api/config/status"), t)).andExpect(status().isForbidden());
        mvc.perform(comToken(get("/api/conhecimento"), t)).andExpect(status().isForbidden());
    }

    @Test
    void prazosSaoIsoladosPorPatrocinador() throws Exception {
        var meus = json(mvc.perform(comToken(get("/api/prazos"), token(MASTER, MASTER_SENHA)))
                .andReturn().getResponse().getContentAsString());
        var todos = json(mvc.perform(comToken(get("/api/prazos"), token(RBS, RBS_SENHA)))
                .andReturn().getResponse().getContentAsString());
        assertThat(meus.size()).isGreaterThan(0);
        meus.forEach(p -> assertThat(p.path("patrocinador").asText()).contains("Master"));
        assertThat(todos.size()).isGreaterThan(meus.size());
    }

    @Test
    void contratoSoApareceAoClienteDepoisDePublicado() throws Exception {
        String rbs = token(RBS, RBS_SENHA);
        String cliente = token(SUBG, SUBG_SENHA);
        long pid = idDe("Subcota G");

        long modelo = json(mvc.perform(comToken(get("/api/contratos/modelos"), rbs)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get(0).path("id").asLong();

        // Sem signatário/empresa há variáveis pendentes: exige confirmação
        String semConfirmar = om.writeValueAsString(Map.of("modeloId", modelo));
        mvc.perform(comToken(post("/api/patrocinadores/" + pid + "/contratos"), rbs)
                .contentType(MediaType.APPLICATION_JSON).content(semConfirmar)).andExpect(status().isUnprocessableEntity());

        String gerar = om.writeValueAsString(Map.of("modeloId", modelo, "ignorarPendentes", true));
        var criado = json(mvc.perform(comToken(post("/api/patrocinadores/" + pid + "/contratos"), rbs)
                        .contentType(MediaType.APPLICATION_JSON).content(gerar)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertThat(criado.path("conteudo").asText()).contains("Marca Subcota G (exemplo)");

        // Cliente ainda não vê a minuta
        var antes = json(mvc.perform(comToken(get("/api/patrocinadores/" + pid + "/contratos"), cliente))
                .andReturn().getResponse().getContentAsString());
        assertThat(antes).isEmpty();

        // Cliente também não pode gerar nem publicar
        mvc.perform(comToken(post("/api/patrocinadores/" + pid + "/contratos"), cliente)
                .contentType(MediaType.APPLICATION_JSON).content(gerar)).andExpect(status().isForbidden());
        mvc.perform(comToken(patch("/api/contratos/" + criado.path("id").asLong()), cliente)
                .contentType(MediaType.APPLICATION_JSON).content("{\"visivelCliente\":true}")).andExpect(status().isForbidden());

        // RBS publica -> cliente vê
        mvc.perform(comToken(patch("/api/contratos/" + criado.path("id").asLong()), rbs)
                .contentType(MediaType.APPLICATION_JSON).content("{\"visivelCliente\":true}")).andExpect(status().isOk());
        var depois = json(mvc.perform(comToken(get("/api/patrocinadores/" + pid + "/contratos"), cliente))
                .andReturn().getResponse().getContentAsString());
        assertThat(depois).hasSize(1);
    }

    @Test
    void loginBloqueiaForcaBruta() throws Exception {
        String corpo = om.writeValueAsString(Map.of("email", "alvo-forca-bruta@exemplo.com", "senha", "errada123"));
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(corpo))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isTooManyRequests());
    }
}
