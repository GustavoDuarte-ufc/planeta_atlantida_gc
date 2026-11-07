package br.com.rbs.portal.web;

import br.com.rbs.portal.dto.PrazoDtos.AlertaRes;
import br.com.rbs.portal.service.AcessoService;
import br.com.rbs.portal.service.AlertaService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alertas")
@RequiredArgsConstructor
public class AlertaController {

    private final AlertaService service;
    private final AcessoService acesso;

    @GetMapping
    public List<AlertaRes> listar() {
        return service.listar(acesso.atual());
    }

    @PostMapping("/{id}/lida")
    public void lida(@PathVariable Long id) {
        service.marcarLida(acesso.atual(), id);
    }

    @PostMapping("/lidas")
    public void todasLidas() {
        service.marcarTodasLidas(acesso.atual());
    }

    /** Roda a verificação de prazos agora (o job diário faz isso sozinho). */
    @PostMapping("/executar")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public Map<String, Integer> executar() {
        return Map.of("criados", service.verificarPrazos(LocalDate.now(ZoneId.of("America/Sao_Paulo"))));
    }
}
