package br.com.rbs.portal.instagram;

import br.com.rbs.portal.domain.Patrocinador;
import br.com.rbs.portal.domain.Role;
import br.com.rbs.portal.domain.TipoAlerta;
import br.com.rbs.portal.repository.PatrocinadorRepository;
import br.com.rbs.portal.service.AlertaService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/** Avisa a marca (e a RBS) quando um post do perfil do evento cita @marca. Um aviso por post. */
@Component
@RequiredArgsConstructor
public class InstagramScheduler {

    private static final Logger log = LoggerFactory.getLogger(InstagramScheduler.class);
    private final InstagramService instagram;
    private final InstagramFonte fonte;
    private final PatrocinadorRepository patrocinadores;
    private final AlertaService alertas;

    @Scheduled(cron = "${portal.instagram.cron:0 0 */3 * * *}", zone = "America/Sao_Paulo")
    public void mencoes() {
        executar();
    }

    /** @return quantos alertas novos saíram */
    public int executar() {
        if (!fonte.configurado()) {
            return 0;
        }
        int novos = 0;
        try {
            instagram.limparCache();
            List<PostIg> posts = instagram.postsDoEvento();
            for (Patrocinador p : patrocinadores.findAll()) {
                for (PostIg post : InstagramMetricas.mencoes(p.getInstagram(), posts)) {
                    String chave = "IG:" + p.getId() + ":" + post.id();
                    String titulo = "Sua marca foi citada no Instagram";
                    String msg = "@" + instagram.eventoUsername() + " citou @" + p.getInstagram() + " em um post de "
                            + post.publicadoEm().atZone(InstagramService.ZONA).toLocalDate()
                            + " (" + post.interacoes() + " interações)." + (post.url() == null ? "" : " " + post.url());
                    if (alertas.notificarUnico(p, Role.ADMIN_PATROCINADOR, TipoAlerta.INSTAGRAM, titulo, msg, chave)) {
                        alertas.notificarUnico(p, Role.ADMIN_RBS, TipoAlerta.INSTAGRAM, p.getNome() + " — " + titulo, msg, chave + ":RBS");
                        novos++;
                    }
                }
            }
        } catch (Exception e) {
            log.error("Falha no job de menções do Instagram", e);
        }
        log.info("Menções do Instagram: {} alerta(s) novo(s)", novos);
        return novos;
    }
}
