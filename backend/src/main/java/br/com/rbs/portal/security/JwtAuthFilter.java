package br.com.rbs.portal.security;

import br.com.rbs.portal.repository.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Lê o Bearer token e carrega o usuário do banco a cada requisição:
 * assim, desativar um e-mail ou mudar o perfil tem efeito imediato.
 * Não é um @Component de propósito: é instanciado só na cadeia do Spring Security
 * (se fosse bean, o Spring Boot o registraria também como filtro de servlet, rodando duas vezes).
 */
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwt;
    private final UsuarioRepository usuarios;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            jwt.emailDe(header.substring(7))
                    .flatMap(usuarios::findByEmailIgnoreCase)
                    .filter(u -> u.isAtivo())
                    .ifPresent(u -> {
                        var auth = new UsernamePasswordAuthenticationToken(
                                u.getEmail(), null, List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole().name())));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    });
        }
        chain.doFilter(req, res);
    }
}
