package br.com.rbs.portal.web;

import br.com.rbs.portal.domain.Aba;
import br.com.rbs.portal.domain.Cortesia;
import br.com.rbs.portal.domain.Patrocinador;
import br.com.rbs.portal.dto.Dtos.CortesiaReq;
import br.com.rbs.portal.dto.Dtos.CortesiaRes;
import br.com.rbs.portal.dto.Dtos.DestinarReq;
import br.com.rbs.portal.repository.CortesiaRepository;
import br.com.rbs.portal.service.AcessoService;
import br.com.rbs.portal.service.HistoricoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** RBS define quantidades por setor/tipo; o cliente "destina" (registra a distribuição). */
@RestController
@RequestMapping("/api/patrocinadores/{pid}/cortesias")
@RequiredArgsConstructor
@Transactional
public class CortesiaController {

    private final CortesiaRepository repo;
    private final AcessoService acesso;
    private final HistoricoService historico;

    @GetMapping
    public List<CortesiaRes> listar(@PathVariable Long pid) {
        acesso.acessarAba(pid, Aba.CORTESIAS);
        return repo.findByPatrocinadorIdOrderBySetorAscTipoAsc(pid).stream().map(CortesiaRes::of).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public CortesiaRes criar(@PathVariable Long pid, @Valid @RequestBody CortesiaReq req) {
        Patrocinador p = acesso.acessarAba(pid, Aba.CORTESIAS);
        Cortesia c = new Cortesia();
        c.setPatrocinador(p);
        c.setSetor(req.setor());
        c.setTipo(req.tipo());
        c.setQuantidade(req.quantidade());
        repo.save(c);
        historico.registrar(p, "DEFINIU_CORTESIA", req.setor() + "/" + req.tipo() + ": " + req.quantidade());
        return CortesiaRes.of(c);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public CortesiaRes atualizar(@PathVariable Long pid, @PathVariable Long id, @Valid @RequestBody CortesiaReq req) {
        Patrocinador p = acesso.acessarAba(pid, Aba.CORTESIAS);
        Cortesia c = buscar(pid, id);
        c.setSetor(req.setor());
        c.setTipo(req.tipo());
        c.setQuantidade(req.quantidade());
        if (c.getDestinada() > c.getQuantidade()) {
            c.setDestinada(c.getQuantidade());
        }
        historico.registrar(p, "ALTEROU_CORTESIA", req.setor() + "/" + req.tipo() + ": " + req.quantidade());
        return CortesiaRes.of(c);
    }

    /** Cliente (ou RBS) registra quantas já foram destinadas. */
    @PatchMapping("/{id}/destinar")
    public CortesiaRes destinar(@PathVariable Long pid, @PathVariable Long id, @Valid @RequestBody DestinarReq req) {
        Patrocinador p = acesso.acessarAba(pid, Aba.CORTESIAS);
        Cortesia c = buscar(pid, id);
        if (req.destinada() > c.getQuantidade()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não é possível destinar mais do que a quantidade disponível");
        }
        c.setDestinada(req.destinada());
        c.setObservacao(req.observacao());
        historico.registrar(p, "DESTINOU_CORTESIA", c.getSetor() + "/" + c.getTipo() + ": " + req.destinada() + " de " + c.getQuantidade());
        return CortesiaRes.of(c);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public void remover(@PathVariable Long pid, @PathVariable Long id) {
        Patrocinador p = acesso.acessarAba(pid, Aba.CORTESIAS);
        Cortesia c = buscar(pid, id);
        repo.delete(c);
        historico.registrar(p, "REMOVEU_CORTESIA", c.getSetor() + "/" + c.getTipo());
    }

    private Cortesia buscar(Long pid, Long id) {
        Cortesia c = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cortesia não encontrada"));
        if (!c.getPatrocinador().getId().equals(pid)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cortesia não encontrada");
        }
        return c;
    }
}
