package br.com.rbs.portal.web;

import br.com.rbs.portal.dto.PainelDtos.Painel;
import br.com.rbs.portal.service.PainelService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.ZoneId;

@RestController
@RequestMapping("/api/painel")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN_RBS')")
public class PainelController {

    private final PainelService service;

    @GetMapping
    public Painel painel(@RequestParam(required = false) Long eventoId) {
        return service.gerar(eventoId, LocalDate.now(ZoneId.of("America/Sao_Paulo")));
    }
}
