package br.com.rbs.portal.service;

import br.com.rbs.portal.config.PortalProps;
import br.com.rbs.portal.domain.TokenSenha;
import br.com.rbs.portal.domain.Usuario;
import br.com.rbs.portal.repository.TokenSenhaRepository;
import br.com.rbs.portal.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Recuperação e troca de senha. O token vai por e-mail e só o hash SHA-256 fica no banco; vale 60 minutos,
 * uso único, e pedir um novo invalida os anteriores. A resposta de "esqueci a senha" é sempre igual,
 * exista ou não o e-mail (não revela quem tem conta).
 */
@Service
@RequiredArgsConstructor
public class SenhaService {

    public static final Duration VALIDADE = Duration.ofMinutes(60);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UsuarioRepository usuarios;
    private final TokenSenhaRepository tokens;
    private final PasswordEncoder encoder;
    private final EmailService email;
    private final PortalProps props;
    private final RateLimiter limite = new RateLimiter(5, Duration.ofHours(1));

    /** Pelo menos 8 caracteres, com letra e número. */
    public static void validarForca(String senha) {
        if (senha == null || senha.length() < 8 || !senha.matches(".*[A-Za-z].*") || !senha.matches(".*\\d.*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A senha deve ter ao menos 8 caracteres, com letras e números");
        }
    }

    static String hash(String token) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @Transactional
    public void solicitar(String emailInformado, String ip) {
        String chave = ip + "|" + emailInformado.toLowerCase();
        if (!limite.tentar(chave)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Muitos pedidos. Tente novamente mais tarde.");
        }
        usuarios.findByEmailIgnoreCase(emailInformado).filter(Usuario::isAtivo).ifPresent(u -> {
            String token = emitirToken(u);
            String link = props.frontendUrl() + "/redefinir-senha?token=" + token;
            email.enviar(java.util.List.of(u.getEmail()), "Redefinição de senha — Portal do Patrocinador",
                    "Redefinir sua senha",
                    "Recebemos um pedido para redefinir a senha do Portal do Patrocinador. O link vale por 60 minutos "
                            + "e só pode ser usado uma vez. Se não foi você, ignore este e-mail.",
                    "Criar nova senha", link);
        });
    }

    /** Cria um token novo (invalidando os anteriores) e devolve o valor em texto — só para ir ao e-mail. */
    @Transactional
    public String emitirToken(Usuario u) {
        tokens.findByUsuarioIdAndUsadoEmIsNull(u.getId()).forEach(t -> t.setUsadoEm(Instant.now()));
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        TokenSenha t = new TokenSenha();
        t.setUsuario(u);
        t.setTokenHash(hash(token));
        t.setExpiraEm(Instant.now().plus(VALIDADE));
        tokens.save(t);
        return token;
    }

    @Transactional
    public void redefinir(String token, String novaSenha) {
        validarForca(novaSenha);
        TokenSenha t = tokens.findByTokenHash(hash(token))
                .filter(x -> x.getUsadoEm() == null && x.getExpiraEm().isAfter(Instant.now()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Link inválido ou expirado"));
        Usuario u = t.getUsuario();
        u.setSenhaHash(encoder.encode(novaSenha));
        usuarios.save(u);
        t.setUsadoEm(Instant.now());
    }

    @Transactional
    public void trocar(Usuario u, String senhaAtual, String novaSenha) {
        if (!encoder.matches(senhaAtual, u.getSenhaHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha atual incorreta");
        }
        validarForca(novaSenha);
        u.setSenhaHash(encoder.encode(novaSenha));
        usuarios.save(u);
    }
}
