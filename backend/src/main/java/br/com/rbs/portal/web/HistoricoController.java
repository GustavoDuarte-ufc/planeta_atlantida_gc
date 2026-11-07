package br.com.rbs.portal.web;

import br.com.rbs.portal.dto.Dtos.HistoricoRes;
import br.com.rbs.portal.repository.HistoricoRepository;
import br.com.rbs.portal.service.AcessoService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/patrocinadores/{pid}/historico")
@RequiredArgsConstructor
public class HistoricoController {

    private final HistoricoRepository repo;
    private final AcessoService acesso;

    @GetMapping
    public List<HistoricoRes> listar(@PathVariable Long pid) {
        acesso.acessar(pid);
        return repo.findTop200ByPatrocinadorIdOrderByCriadoEmDesc(pid).stream().map(HistoricoRes::of).toList();
    }
}
