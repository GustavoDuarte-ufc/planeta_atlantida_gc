package br.com.rbs.portal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// Autenticação é feita por JWT próprio; não queremos o usuário/senha gerado automaticamente.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class PortalApplication {
    public static void main(String[] args) {
        SpringApplication.run(PortalApplication.class, args);
    }
}
