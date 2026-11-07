package br.com.rbs.portal.web;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EventosMensagensTest extends ApiTestSupport {

    @Test
    void marcasDeDemonstracaoPertencemAoEventoPadrao() throws Exception {
        var eventos = json(mvc.perform(comToken(get("/api/eventos"), token(RBS, RBS_SENHA))).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertThat(eventos.size()).isGreaterThanOrEqualTo(1);
        assertThat(eventos.get(0).path("marcas").asInt()).isGreaterThanOrEqualTo(3);
    }

    @Test
    void marcaNaoCriaEvento() throws Exception {
        String corpo = om.writeValueAsString(Map.of("nome", "X", "inicio", "2027-01-29"));
        mvc.perform(comToken(post("/api/eventos"), token(MASTER, MASTER_SENHA)).contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isForbidden());
    }

    @Test
    void mensagemDaMarcaChegaNaRbsEFicaIsolada() throws Exception {
        String tm = token(MASTER, MASTER_SENHA);
        String rbs = token(RBS, RBS_SENHA);
        long master = idDe("Master");
        long sub = idDe("Subcota (exemplo)");
        String corpo = om.writeValueAsString(Map.of("assunto", "Dúvida", "texto", "Qual o prazo do logo?"));
        mvc.perform(comToken(post("/api/patrocinadores/" + master + "/mensagens"), tm).contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isOk());

        var caixa = json(mvc.perform(comToken(get("/api/mensagens/caixa"), rbs)).andReturn().getResponse().getContentAsString());
        assertThat(caixa.toString()).contains("Qual o prazo do logo?");

        // a marca Master não lê nem escreve na conversa de outra marca, nem vê a caixa da RBS
        mvc.perform(comToken(get("/api/patrocinadores/" + sub + "/mensagens"), tm)).andExpect(status().isForbidden());
        mvc.perform(comToken(post("/api/patrocinadores/" + sub + "/mensagens"), tm).contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isForbidden());
        mvc.perform(comToken(get("/api/mensagens/caixa"), tm)).andExpect(status().isForbidden());
        mvc.perform(comToken(get("/api/painel"), tm)).andExpect(status().isForbidden());

        // mensagem vazia é recusada
        mvc.perform(comToken(post("/api/patrocinadores/" + master + "/mensagens"), tm).contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(Map.of("texto", "  ")))).andExpect(status().isBadRequest());
    }

    @Test
    void painelDaRbsTraTotais() throws Exception {
        var p = json(mvc.perform(comToken(get("/api/painel"), token(RBS, RBS_SENHA))).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertThat(p.path("totais").path("marcas").asInt()).isGreaterThanOrEqualTo(3);
        assertThat(p.path("semanas").size()).isEqualTo(9);
    }

    @Test
    void dashboardDaMarcaEIsoladoEMostraSoOsDadosDela() throws Exception {
        String tm = token(MASTER, MASTER_SENHA);
        long master = idDe("Master");
        long sub = idDe("Subcota (exemplo)");
        var p = json(mvc.perform(comToken(get("/api/patrocinadores/" + master + "/painel"), tm)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertThat(p.path("marca").asText()).contains("Master");
        assertThat(p.path("abasTotal").asInt()).isGreaterThan(0);
        assertThat(p.path("atividade").toString()).doesNotContain("@"); // não expõe e-mails da equipe
        mvc.perform(comToken(get("/api/patrocinadores/" + sub + "/painel"), tm)).andExpect(status().isForbidden());
        mvc.perform(comToken(get("/api/patrocinadores/" + sub + "/painel"), token(RBS, RBS_SENHA))).andExpect(status().isOk());
    }
}
