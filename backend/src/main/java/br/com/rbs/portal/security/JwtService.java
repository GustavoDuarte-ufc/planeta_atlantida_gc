package br.com.rbs.portal.security;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expiracaoMin;

    public JwtService(@Value("${portal.jwt.secret}") String secret,
                      @Value("${portal.jwt.expiration-minutes}") long expiracaoMin) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("portal.jwt.secret precisa ter pelo menos 32 caracteres");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expiracaoMin = expiracaoMin;
    }

    public String gerar(String email) {
        long agora = System.currentTimeMillis();
        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date(agora))
                .expiration(new Date(agora + expiracaoMin * 60_000))
                .signWith(key)
                .compact();
    }

    /** Retorna o e-mail do token se ele for válido e não expirado. */
    public Optional<String> emailDe(String token) {
        try {
            return Optional.ofNullable(
                    Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
