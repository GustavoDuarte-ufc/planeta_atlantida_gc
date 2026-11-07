package br.com.rbs.portal.web;

import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.dto.PrazoDtos.*;
import br.com.rbs.portal.repository.PrazoRepository;
import br.com.rbs.portal.service.AcessoService;
import br.com.rbs.portal.service.HistoricoService;
import br.com.rbs.portal.service.PrazoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Transactional
public class PrazoController {

    private static final ZoneId BR = ZoneId.of("America/Sao_Paulo");

    private final PrazoRepository repo;
    private final PrazoService service;
    private final AcessoService acesso;
    private final HistoricoService historico;

    private static LocalDate hoje() {
        return LocalDate.now(BR);
    }

    /** RBS: todos os prazos de todos os patrocinadores. Patrocinador: só os seus. */
    @GetMapping("/prazos")
    public List<PrazoRes> listar() {
        Usuario u = acesso.atual();
        if (u.getRole() == Role.ADMIN_RBS) {
            return service.todos(hoje());
        }
        return u.getPatrocinador() == null ? List.of() : service.dosPatrocinador(u.getPatrocinador().getId(), hoje());
    }

    @GetMapping("/patrocinadores/{pid}/prazos")
    public List<PrazoRes> listarDoPatrocinador(@PathVariable Long pid) {
        acesso.acessar(pid);
        return service.dosPatrocinador(pid, hoje());
    }

    @PostMapping("/patrocinadores/{pid}/prazos")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public PrazoRes criar(@PathVariable Long pid, @Valid @RequestBody PrazoReq req) {
        Patrocinador p = acesso.acessar(pid);
        TipoEntrega tipo = req.tipo() == null ? TipoEntrega.PERSONALIZADO : req.tipo();
        if (tipo.isAutomatico()) {
            if (!p.getCota().permite(tipo.getAba())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A cota deste patrocinador não inclui essa entrega");
            }
            if (repo.existsByPatrocinadorIdAndTipo(pid, tipo)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Esse prazo já existe para o patrocinador");
            }
        }
        Prazo pz = new Prazo();
        pz.setPatrocinador(p);
        pz.setTipo(tipo);
        pz.setTitulo(req.titulo().trim());
        pz.setDescricao(req.descricao());
        pz.setDataLimite(req.dataLimite());
        repo.save(pz);
        historico.registrar(p, "CRIOU_PRAZO", pz.getTitulo() + " — " + pz.getDataLimite());
        return service.res(pz, hoje());
    }

    @PutMapping("/prazos/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public PrazoRes atualizar(@PathVariable Long id, @Valid @RequestBody PrazoReq req) {
        Prazo pz = obter(id);
        pz.setTitulo(req.titulo().trim());
        pz.setDescricao(req.descricao());
        pz.setDataLimite(req.dataLimite());
        historico.registrar(pz.getPatrocinador(), "ALTEROU_PRAZO", pz.getTitulo() + " — " + pz.getDataLimite());
        return service.res(pz, hoje());
    }

    @DeleteMapping("/prazos/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public void remover(@PathVariable Long id) {
        Prazo pz = obter(id);
        repo.delete(pz);
        historico.registrar(pz.getPatrocinador(), "REMOVEU_PRAZO", pz.getTitulo());
    }

    /** Marca/desmarca um prazo PERSONALIZADO. Os automáticos mudam sozinhos quando a entrega acontece. */
    @PatchMapping("/prazos/{id}/concluido")
    public PrazoRes concluir(@PathVariable Long id, @RequestBody ConcluidoReq req) {
        Prazo pz = obter(id);
        acesso.acessar(pz.getPatrocinador().getId());
        if (pz.getTipo().isAutomatico()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Este prazo é concluído automaticamente quando a entrega é feita no portal");
        }
        pz.setConcluidoManual(req.concluido());
        historico.registrar(pz.getPatrocinador(), req.concluido() ? "CONCLUIU_PRAZO" : "REABRIU_PRAZO", pz.getTitulo());
        return service.res(pz, hoje());
    }

    /** Recria os prazos padrão que faltam (útil após mudar a cota ou a data do evento). */
    @PostMapping("/patrocinadores/{pid}/prazos/padrao")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public List<PrazoRes> gerarPadrao(@PathVariable Long pid) {
        Patrocinador p = acesso.acessar(pid);
        int n = service.gerarPadrao(p);
        if (n > 0) {
            historico.registrar(p, "GEROU_PRAZOS", n + " prazo(s) padrão");
        }
        return service.dosPatrocinador(pid, hoje());
    }

    /** Calendário no formato .ics (Outlook, Google Agenda, Apple). */
    @GetMapping("/calendario.ics")
    public ResponseEntity<byte[]> ics() {
        String corpo = PrazoService.ics(listar());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"prazos-portal.ics\"")
                .contentType(MediaType.parseMediaType("text/calendar;charset=UTF-8"))
                .body(corpo.getBytes(StandardCharsets.UTF_8));
    }

    private Prazo obter(Long id) {
        Prazo pz = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prazo não encontrado"));
        acesso.acessar(pz.getPatrocinador().getId());
        return pz;
    }
}
