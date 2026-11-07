package br.com.rbs.portal.web;

import br.com.rbs.portal.domain.Evento;
import br.com.rbs.portal.domain.Patrocinador;
import br.com.rbs.portal.domain.Role;
import br.com.rbs.portal.domain.Usuario;
import br.com.rbs.portal.dto.EventoDtos.EventoReq;
import br.com.rbs.portal.dto.EventoDtos.EventoRes;
import br.com.rbs.portal.repository.EventoRepository;
import br.com.rbs.portal.repository.PatrocinadorRepository;
import br.com.rbs.portal.service.AcessoService;
import br.com.rbs.portal.service.EventoService;
import br.com.rbs.portal.service.PrazoService;
import br.com.rbs.portal.service.RelatorioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/eventos")
@RequiredArgsConstructor
@Transactional
public class EventoController {

    private final EventoRepository eventos;
    private final PatrocinadorRepository patrocinadores;
    private final EventoService service;
    private final AcessoService acesso;
    private final RelatorioService relatorio;
    private final PrazoService prazos;

    /** RBS vê todos os eventos; a marca vê só o seu. */
    @GetMapping
    public List<EventoRes> listar() {
        Usuario u = acesso.atual();
        LocalDate hoje = LocalDate.now(java.time.ZoneId.of("America/Sao_Paulo"));
        if (u.getRole() != Role.ADMIN_RBS) {
            Patrocinador p = u.getPatrocinador();
            return p == null || p.getEvento() == null ? List.of() : List.of(res(p.getEvento(), hoje));
        }
        return eventos.findAllByOrderByInicioDesc().stream().map(e -> res(e, hoje)).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public EventoRes criar(@Valid @RequestBody EventoReq req) {
        Evento e = new Evento();
        aplicar(e, req);
        eventos.save(e);
        return res(e, hoje());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public EventoRes atualizar(@PathVariable Long id, @Valid @RequestBody EventoReq req) {
        Evento e = eventos.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        boolean mudouData = !e.getInicio().equals(req.inicio());
        aplicar(e, req);
        if (mudouData) { // os prazos padrão abertos de todas as marcas acompanham a nova data
            patrocinadores.findByEventoId(id, org.springframework.data.domain.Sort.by("nome")).forEach(prazos::reagendar);
        }
        return res(e, hoje());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public void remover(@PathVariable Long id) {
        if (patrocinadores.countByEventoId(id) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mova ou remova as marcas deste evento antes de excluí-lo.");
        }
        if (eventos.count() <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "É preciso manter ao menos um evento.");
        }
        eventos.deleteById(id);
    }

    private void aplicar(Evento e, EventoReq req) {
        if (req.fim() != null && req.fim().isBefore(req.inicio())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A data final não pode ser anterior à inicial.");
        }
        e.setNome(req.nome().trim());
        e.setInicio(req.inicio());
        e.setFim(req.fim());
        e.setLocal(req.local() == null || req.local().isBlank() ? null : req.local().trim());
        e.setDescricao(req.descricao() == null || req.descricao().isBlank() ? null : req.descricao().trim());
    }

    private EventoRes res(Evento e, LocalDate hoje) {
        List<Patrocinador> marcas = patrocinadores.findByEventoId(e.getId(), org.springframework.data.domain.Sort.by("nome"));
        int media = marcas.isEmpty() ? 0 : (int) Math.round(marcas.stream().mapToInt(relatorio::progresso).average().orElse(0));
        return service.res(e, marcas.size(), media, hoje);
    }

    private static LocalDate hoje() {
        return LocalDate.now(java.time.ZoneId.of("America/Sao_Paulo"));
    }
}
