package br.com.rbs.portal.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

/** Job diário dos alertas de prazo. Cron em portal.alertas.cron (padrão: todo dia às 08:00, horário de Brasília). */
@Component
@RequiredArgsConstructor
public class AlertaScheduler {

    private static final Logger log = LoggerFactory.getLogger(AlertaScheduler.class);
    private final AlertaService alertas;

    @Scheduled(cron = "${portal.alertas.cron:0 0 8 * * *}", zone = "America/Sao_Paulo")
    public void diario() {
        try {
            alertas.verificarPrazos(LocalDate.now(ZoneId.of("America/Sao_Paulo")));
        } catch (Exception e) {
            log.error("Falha no job de alertas", e);
        }
    }
}
