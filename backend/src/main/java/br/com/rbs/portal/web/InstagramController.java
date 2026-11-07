package br.com.rbs.portal.web;

import br.com.rbs.portal.dto.InstagramDtos.InstagramRes;
import br.com.rbs.portal.domain.Aba;
import br.com.rbs.portal.instagram.InstagramScheduler;
import br.com.rbs.portal.instagram.InstagramService;
import br.com.rbs.portal.service.AcessoService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class InstagramController {

    private final InstagramService service;
    private final InstagramScheduler scheduler;
    private final AcessoService acesso;

    /** Perfil do evento (visível a qualquer usuário logado). */
    @GetMapping("/api/instagram/evento")
    public InstagramRes evento() {
        acesso.atual();
        return service.evento();
    }

    /** Métricas da marca + menções; respeita o isolamento entre patrocinadores. */
    @GetMapping("/api/patrocinadores/{pid}/instagram")
    public InstagramRes doPatrocinador(@PathVariable Long pid) {
        return service.doPatrocinador(acesso.acessarAba(pid, Aba.MIDIA));
    }

    /** Testa a conexão com o MongoDB e mostra o que ele enxerga (bancos e coleções). */
    @PostMapping("/api/instagram/testar")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public Map<String, Object> testar() {
        return service.diagnosticar();
    }

    /** Força nova leitura do banco e procura menções agora. */
    @PostMapping("/api/instagram/sincronizar")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public Map<String, Object> sincronizar() {
        return Map.of("alertasNovos", scheduler.executar());
    }
}
