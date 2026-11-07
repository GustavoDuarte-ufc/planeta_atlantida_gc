package br.com.rbs.portal.web;

import br.com.rbs.portal.domain.Usuario;
import br.com.rbs.portal.dto.Dtos.LoginReq;
import br.com.rbs.portal.dto.Dtos.LoginRes;
import br.com.rbs.portal.dto.SenhaDtos.*;
import br.com.rbs.portal.repository.UsuarioRepository;
import br.com.rbs.portal.security.JwtService;
import br.com.rbs.portal.service.AcessoService;
import br.com.rbs.portal.service.RateLimiter;
import br.com.rbs.portal.service.SenhaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AcessoService acesso;
    private final SenhaService senhas;

    /** Bloqueia por 15 min após 5 falhas do mesmo IP + e-mail (força bruta). */
    private final RateLimiter falhasLogin = new RateLimiter(5, Duration.ofMinutes(15));

    @PostMapping("/login")
    public LoginRes login(@Valid @RequestBody LoginReq req, HttpServletRequest http) {
        String chave = http.getRemoteAddr() + "|" + req.email().toLowerCase();
        if (falhasLogin.excedido(chave)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Muitas tentativas. Aguarde 15 minutos ou redefina a senha.");
        }
        // Mensagem única para e-mail inexistente, inativo ou senha errada (não revela quais e-mails existem)
        Usuario u = usuarios.findByEmailIgnoreCase(req.email())
                .filter(Usuario::isAtivo)
                .filter(x -> encoder.matches(req.senha(), x.getSenhaHash()))
                .orElse(null);
        if (u == null) {
            falhasLogin.registrar(chave);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos");
        }
        falhasLogin.limpar(chave);
        return resposta(u, jwt.gerar(u.getEmail()));
    }

    @GetMapping("/me")
    public LoginRes me() {
        return resposta(acesso.atual(), null);
    }

    /** Sempre responde 200 com a mesma mensagem, exista ou não o e-mail. */
    @PostMapping("/esqueci-senha")
    public Map<String, String> esqueci(@Valid @RequestBody EsqueciReq req, HttpServletRequest http) {
        senhas.solicitar(req.email(), http.getRemoteAddr());
        return Map.of("mensagem", "Se o e-mail estiver cadastrado, enviamos um link para criar uma nova senha.");
    }

    @PostMapping("/redefinir-senha")
    public Map<String, String> redefinir(@Valid @RequestBody RedefinirReq req) {
        senhas.redefinir(req.token(), req.senha());
        return Map.of("mensagem", "Senha alterada. Entre com a nova senha.");
    }

    @PutMapping("/senha")
    public Map<String, String> trocar(@Valid @RequestBody TrocarReq req) {
        senhas.trocar(acesso.atual(), req.senhaAtual(), req.novaSenha());
        return Map.of("mensagem", "Senha alterada.");
    }

    private LoginRes resposta(Usuario u, String token) {
        return new LoginRes(token, u.getNome(), u.getEmail(), u.getRole(),
                u.getPatrocinador() == null ? null : u.getPatrocinador().getId(),
                u.getPatrocinador() == null ? null : u.getPatrocinador().getFrontendId());
    }
}
