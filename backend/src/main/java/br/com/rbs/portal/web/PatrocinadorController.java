package br.com.rbs.portal.web;

import br.com.rbs.portal.domain.Patrocinador;
import br.com.rbs.portal.domain.Role;
import br.com.rbs.portal.domain.Usuario;
import br.com.rbs.portal.dto.Dtos.PatrocinadorReq;
import br.com.rbs.portal.dto.Dtos.PatrocinadorRes;
import br.com.rbs.portal.repository.EventoRepository;
import br.com.rbs.portal.repository.PatrocinadorRepository;
import br.com.rbs.portal.service.EventoService;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import br.com.rbs.portal.domain.Evento;
import br.com.rbs.portal.service.AcessoService;
import br.com.rbs.portal.service.HistoricoService;
import br.com.rbs.portal.instagram.InstagramService;
import br.com.rbs.portal.service.PrazoService;
import br.com.rbs.portal.service.RelatorioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patrocinadores")
@RequiredArgsConstructor
@Transactional
public class PatrocinadorController {

    private final PatrocinadorRepository repo;
    private final AcessoService acesso;
    private final RelatorioService relatorio;
    private final HistoricoService historico;
    private final PrazoService prazos;
    private final EventoRepository eventos;
    private final EventoService eventoService;
    private final br.com.rbs.portal.service.PainelService painel;

    /** RBS vê todos; patrocinador vê apenas o próprio. */
    @GetMapping
    public List<PatrocinadorRes> listar(@RequestParam(required = false) Long eventoId) {
        Usuario u = acesso.atual();
        List<Patrocinador> lista;
        if (u.getRole() == Role.ADMIN_RBS) {
            lista = eventoId == null ? repo.findAll(Sort.by("nome")) : repo.findByEventoId(eventoId, Sort.by("nome"));
        } else {
            lista = u.getPatrocinador() == null ? List.of() : List.of(u.getPatrocinador());
        }
        return lista.stream().map(this::res).toList();
    }

    @GetMapping("/{id}")
    public PatrocinadorRes obter(@PathVariable Long id) {
        return res(acesso.acessar(id));
    }

    private PatrocinadorRes res(Patrocinador p) {
        return PatrocinadorRes.of(p, relatorio.progresso(p), relatorio.abasConcluidas(p));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public PatrocinadorRes criar(@Valid @RequestBody PatrocinadorReq req) {
        Patrocinador p = new Patrocinador();
        p.setNome(req.nome().trim());
        p.setCota(req.cota());
        p.setInstagram(InstagramService.normalizarHandle(req.instagram()));
        p.setEvento(eventoDe(req.eventoId()));
        repo.save(p);
        historico.registrar(p, "CRIOU_PATROCINADOR", p.getNome() + " (" + p.getCota().getLabel() + ")");
        int n = prazos.gerarPadrao(p); // automação: prazos padrão da cota
        if (n > 0) {
            historico.registrar(p, "GEROU_PRAZOS", n + " prazo(s) padrão");
        }
        return res(p);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public PatrocinadorRes atualizar(@PathVariable Long id, @Valid @RequestBody PatrocinadorReq req) {
        Patrocinador p = acesso.acessar(id);
        p.setNome(req.nome().trim());
        p.setCota(req.cota());
        p.setInstagram(InstagramService.normalizarHandle(req.instagram()));
        if (req.eventoId() != null) {
            p.setEvento(eventoDe(req.eventoId()));
        }
        historico.registrar(p, "ATUALIZOU_PATROCINADOR", p.getNome() + " (" + p.getCota().getLabel() + ")");
        prazos.gerarPadrao(p);
        prazos.reagendar(p); // se mudou de evento, as datas dos prazos abertos acompanham // se a cota mudou, cria os prazos que passam a existir
        return res(p);
    }

    private Evento eventoDe(Long id) {
        if (id == null) {
            return eventoService.padrao();
        }
        return eventos.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Evento não encontrado"));
    }

    /** Dashboard da própria marca (ou de qualquer marca, para a RBS). */
    @GetMapping("/{id}/painel")
    public br.com.rbs.portal.dto.PainelDtos.PainelMarca painel(@PathVariable Long id) {
        return painel.marca(acesso.acessar(id), java.time.LocalDate.now(java.time.ZoneId.of("America/Sao_Paulo")));
    }

    @GetMapping("/{id}/relatorio")
    public Map<String, Object> relatorio(@PathVariable Long id) {
        return relatorio.gerar(acesso.acessar(id));
    }
}
