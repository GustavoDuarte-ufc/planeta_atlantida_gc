package br.com.rbs.portal.service;

import br.com.rbs.portal.domain.Role;
import br.com.rbs.portal.domain.Usuario;
import br.com.rbs.portal.repository.UsuarioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SenhaRecuperacaoTest {

    @Autowired SenhaService senhas;
    @Autowired UsuarioRepository usuarios;
    @Autowired PasswordEncoder encoder;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private Usuario novoUsuario() {
        Usuario u = new Usuario();
        u.setNome("Teste");
        u.setEmail("teste-" + UUID.randomUUID() + "@exemplo.com");
        u.setSenhaHash(encoder.encode("SenhaAntiga1"));
        u.setRole(Role.ADMIN_RBS);
        return usuarios.save(u);
    }

    private int login(String email, String senha) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(Map.of("email", email, "senha", senha))))
                .andReturn().getResponse().getStatus();
    }

    @Test
    void fluxoCompletoDeRedefinicao() throws Exception {
        Usuario u = novoUsuario();
        String token = senhas.emitirToken(u);

        senhas.redefinir(token, "NovaSenha123");

        assertThat(login(u.getEmail(), "NovaSenha123")).isEqualTo(200);
        assertThat(login(u.getEmail(), "SenhaAntiga1")).isEqualTo(401);
    }

    @Test
    void tokenSoPodeSerUsadoUmaVez() {
        Usuario u = novoUsuario();
        String token = senhas.emitirToken(u);
        senhas.redefinir(token, "NovaSenha123");
        assertThatThrownBy(() -> senhas.redefinir(token, "OutraSenha456")).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void novoTokenInvalidaOAnterior() {
        Usuario u = novoUsuario();
        String antigo = senhas.emitirToken(u);
        String novo = senhas.emitirToken(u);
        assertThatThrownBy(() -> senhas.redefinir(antigo, "NovaSenha123")).isInstanceOf(ResponseStatusException.class);
        senhas.redefinir(novo, "NovaSenha123");
    }

    @Test
    void tokenInventadoEFraco() {
        assertThatThrownBy(() -> senhas.redefinir("token-que-nao-existe", "NovaSenha123"))
                .isInstanceOf(ResponseStatusException.class);
        Usuario u = novoUsuario();
        String token = senhas.emitirToken(u);
        assertThatThrownBy(() -> senhas.redefinir(token, "curta")).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> senhas.redefinir(token, "somenteletras")).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void esqueciSenhaNaoRevelaSeOEmailExiste() throws Exception {
        Usuario u = novoUsuario();
        String existente = om.writeValueAsString(Map.of("email", u.getEmail()));
        String inexistente = om.writeValueAsString(Map.of("email", "ninguem-" + UUID.randomUUID() + "@exemplo.com"));

        var a = mvc.perform(post("/api/auth/esqueci-senha").contentType(MediaType.APPLICATION_JSON).content(existente))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var b = mvc.perform(post("/api/auth/esqueci-senha").contentType(MediaType.APPLICATION_JSON).content(inexistente))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(a).isEqualTo(b);
    }

    @Test
    void trocaDeSenhaExigeSenhaAtual() throws Exception {
        Usuario u = novoUsuario();
        String t = om.readTree(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(Map.of("email", u.getEmail(), "senha", "SenhaAntiga1"))))
                .andReturn().getResponse().getContentAsString()).path("token").asText();

        var put = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/auth/senha")
                .header("Authorization", "Bearer " + t).contentType(MediaType.APPLICATION_JSON);
        mvc.perform(put.content(om.writeValueAsString(Map.of("senhaAtual", "errada", "novaSenha", "NovaSenha123"))))
                .andExpect(status().isBadRequest());
        mvc.perform(put.content(om.writeValueAsString(Map.of("senhaAtual", "SenhaAntiga1", "novaSenha", "NovaSenha123"))))
                .andExpect(status().isOk());
        assertThat(login(u.getEmail(), "NovaSenha123")).isEqualTo(200);
    }
}
