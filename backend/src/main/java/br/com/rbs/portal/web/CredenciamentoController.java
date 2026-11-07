package br.com.rbs.portal.web;

import br.com.rbs.portal.domain.Aba;
import br.com.rbs.portal.domain.Credenciamento;
import br.com.rbs.portal.domain.Patrocinador;
import br.com.rbs.portal.dto.Dtos.CredReq;
import br.com.rbs.portal.dto.Dtos.CredRes;
import br.com.rbs.portal.repository.CredenciamentoRepository;
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

/** Tabela de credenciamento (dezembro): RBS preenche, cliente consulta. */
@RestController
@RequestMapping("/api/patrocinadores/{pid}/credenciamento")
@RequiredArgsConstructor
@Transactional
public class CredenciamentoController {

    private final CredenciamentoRepository repo;
    private final AcessoService acesso;
    private final HistoricoService historico;

    @GetMapping
    public List<CredRes> listar(@PathVariable Long pid) {
        acesso.acessarAba(pid, Aba.CREDENCIAMENTO);
        return repo.findByPatrocinadorIdOrderBySetorAsc(pid).stream().map(CredRes::of).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public CredRes criar(@PathVariable Long pid, @Valid @RequestBody CredReq req) {
        Patrocinador p = acesso.acessarAba(pid, Aba.CREDENCIAMENTO);
        Credenciamento c = new Credenciamento();
        c.setPatrocinador(p);
        c.setSetor(req.setor());
        c.setQuantidade(req.quantidade());
        repo.save(c);
        historico.registrar(p, "DEFINIU_CREDENCIAMENTO", req.setor() + ": " + req.quantidade());
        return CredRes.of(c);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public void remover(@PathVariable Long pid, @PathVariable Long id) {
        Patrocinador p = acesso.acessarAba(pid, Aba.CREDENCIAMENTO);
        Credenciamento c = repo.findById(id)
                .filter(x -> x.getPatrocinador().getId().equals(pid))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro não encontrado"));
        repo.delete(c);
        historico.registrar(p, "REMOVEU_CREDENCIAMENTO", c.getSetor() + ": " + c.getQuantidade());
    }
}
