package br.com.rbs.portal.service;

import br.com.rbs.portal.domain.Prazo;
import br.com.rbs.portal.repository.AlertaRepository;
import br.com.rbs.portal.repository.PrazoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class AlertaServiceTest {

    @Autowired AlertaService alertas;
    @Autowired AlertaRepository alertaRepo;
    @Autowired PrazoRepository prazos;

    @Test
    void sementesCriamPrazosPorCota() {
        // Master (7 abas) tem mais prazos que Subcota (3 abas)
        var todos = prazos.findAll();
        long master = todos.stream().filter(p -> p.getPatrocinador().getNome().contains("Master")).count();
        long sub = todos.stream().filter(p -> p.getPatrocinador().getNome().contains("Subcota (exemplo)")).count();
        assertThat(master).isGreaterThan(sub).isGreaterThan(0);
    }

    @Test
    void alertaDePrazoSaiUmaVezSo() {
        Prazo pz = prazos.findAllByOrderByDataLimiteAsc().get(0);
        var hoje = pz.getDataLimite().minusDays(3); // faltam 3 dias

        int primeira = alertas.verificarPrazos(hoje);
        long antes = alertaRepo.count();
        int segunda = alertas.verificarPrazos(hoje);

        assertThat(primeira).isGreaterThan(0);
        assertThat(segunda).isZero();            // mesmo marco: não repete
        assertThat(alertaRepo.count()).isEqualTo(antes);
    }

    @Test
    void atrasoGeraAlertaTambemParaARbs() {
        Prazo pz = prazos.findAllByOrderByDataLimiteAsc().get(0);
        long antes = alertaRepo.count();
        alertas.verificarPrazos(pz.getDataLimite().plusDays(2)); // atrasado
        assertThat(alertaRepo.count()).isGreaterThan(antes);
        assertThat(alertaRepo.findTop100ByDestinoOrderByCriadoEmDesc(br.com.rbs.portal.domain.Role.ADMIN_RBS)).isNotEmpty();
    }
}
