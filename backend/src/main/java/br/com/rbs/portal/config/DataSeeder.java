package br.com.rbs.portal.config;

import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.repository.PatrocinadorRepository;
import br.com.rbs.portal.repository.UsuarioRepository;
import br.com.rbs.portal.service.EventoService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Dados de DEMONSTRAÇÃO (somente se o banco estiver vazio e portal.seed-demo=true).
 * Em produção: SEED_DEMO=false e crie o primeiro Admin RBS de forma controlada.
 */
@Component
@Order(1)
@RequiredArgsConstructor
@ConditionalOnProperty(name = "portal.seed-demo", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UsuarioRepository usuarios;
    private final PatrocinadorRepository patrocinadores;
    private final PasswordEncoder encoder;
    private final EventoService eventos;

    @Override
    public void run(String... args) {
        // Não altera contas existentes nem redefine senhas: permite habilitar a demo
        // mesmo quando o banco H2 já contém usuários reais.
        if (usuarios.findByEmailIgnoreCase("admin@rbs.com.br").isEmpty())
            criarUsuario("Admin RBS", "admin@rbs.com.br", "Admin@1234", Role.ADMIN_RBS, null);
        criarDemo("solar", "Solar Bebidas (demonstração)", Cota.MASTER, "Marina Alves", "patrocinador@solar.com.br", "Solar@1234");
        criarDemo("banco", "Banco do Sul (demonstração)", Cota.MASTER, "Felipe Ramos", "felipe@bancodosul.com.br", "Banco@1234");
        criarDemo("nativa", "Nativa Telecom (demonstração)", Cota.SUBCOTA_G, "Camila Rocha", "camila@nativatelecom.com.br", "Nativa@1234");
        criarDemo("cooper", "Cooperativa Horizonte (demonstração)", Cota.MASTER, "Eduardo Lima", "eduardo@horizonte.coop.br", "Cooper@1234");
        criarDemo("universo", "Universo Tech (demonstração)", Cota.SUBCOTA, "Renata Dias", "renata@universotech.com.br", "Universo@1234");
        log.info("Contas de demonstração verificadas sem alterar usuários existentes.");
    }

    private void criarDemo(String frontendId, String nomeMarca, Cota cota, String nome,
                           String email, String senha) {
        Patrocinador p = patrocinadores.findByFrontendId(frontendId).orElseGet(() -> {
            Patrocinador novo = new Patrocinador();
            novo.setFrontendId(frontendId);
            novo.setNome(nomeMarca);
            novo.setCota(cota);
            novo.setEvento(eventos.padrao());
            return patrocinadores.save(novo);
        });
        if (usuarios.findByEmailIgnoreCase(email).isEmpty())
            criarUsuario(nome, email, senha, Role.ADMIN_PATROCINADOR, p);
    }

    private Patrocinador criarPatrocinador(String nome, Cota cota) {
        Patrocinador p = new Patrocinador();
        p.setNome(nome);
        p.setCota(cota);
        p.setEvento(eventos.padrao());
        return patrocinadores.save(p);
    }

    private void criarUsuario(String nome, String email, String senha, Role role, Patrocinador p) {
        Usuario u = new Usuario();
        u.setNome(nome);
        u.setEmail(email);
        u.setSenhaHash(encoder.encode(senha));
        u.setRole(role);
        u.setPatrocinador(p);
        usuarios.save(u);
    }
}
