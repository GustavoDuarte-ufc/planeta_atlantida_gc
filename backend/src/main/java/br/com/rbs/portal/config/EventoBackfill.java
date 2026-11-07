package br.com.rbs.portal.config;

import br.com.rbs.portal.service.EventoService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Garante que existe ao menos um evento e que toda marca pertence a algum. Idempotente. */
@Component
@Order(0)
@RequiredArgsConstructor
public class EventoBackfill implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(EventoBackfill.class);
    private final EventoService eventos;

    @Override
    public void run(String... args) {
        eventos.padrao();
        int n = eventos.vincularLegado();
        if (n > 0) {
            log.info("{} marca(s) antiga(s) vinculada(s) ao evento padrão", n);
        }
    }
}
