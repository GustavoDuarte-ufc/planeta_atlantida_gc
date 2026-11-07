package br.com.rbs.portal.web;

import br.com.rbs.portal.domain.Aba;
import br.com.rbs.portal.domain.Patrocinador;
import br.com.rbs.portal.domain.PerguntaPesquisa;
import br.com.rbs.portal.dto.Dtos.PerguntaReq;
import br.com.rbs.portal.dto.Dtos.PerguntaRes;
import br.com.rbs.portal.dto.Dtos.ResultadoReq;
import br.com.rbs.portal.repository.PerguntaPesquisaRepository;
import br.com.rbs.portal.service.AcessoService;
import br.com.rbs.portal.service.HistoricoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

/** 3 perguntas personalizadas por patrocinador; resultados vêm do instituto (via Admin RBS). */
@RestController
@RequestMapping("/api/patrocinadores/{pid}/pesquisa")
@RequiredArgsConstructor
@Transactional
public class PesquisaController {

    private final PerguntaPesquisaRepository repo;
    private final AcessoService acesso;
    private final HistoricoService historico;

    /** Sempre devolve as 3 posições, mesmo as ainda vazias. */
    @GetMapping
    public List<PerguntaRes> listar(@PathVariable Long pid) {
        acesso.acessarAba(pid, Aba.PESQUISA);
        List<PerguntaPesquisa> salvas = repo.findByPatrocinadorIdOrderByOrdem(pid);
        List<PerguntaRes> out = new ArrayList<>();
        for (int ordem = 1; ordem <= 3; ordem++) {
            final int o = ordem;
            out.add(salvas.stream().filter(q -> q.getOrdem() == o).findFirst()
                    .map(PerguntaRes::of).orElse(new PerguntaRes(o, null, null)));
        }
        return out;
    }

    @PutMapping("/{ordem}/pergunta")
    public PerguntaRes salvarPergunta(@PathVariable Long pid, @PathVariable int ordem, @Valid @RequestBody PerguntaReq req) {
        Patrocinador p = acesso.acessarAba(pid, Aba.PESQUISA);
        PerguntaPesquisa q = obterOuCriar(p, ordem);
        q.setPergunta(req.pergunta().trim());
        historico.registrar(p, "SALVOU_PERGUNTA_PESQUISA", ordem + ") " + q.getPergunta());
        return PerguntaRes.of(q);
    }

    @PutMapping("/{ordem}/resultado")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public PerguntaRes salvarResultado(@PathVariable Long pid, @PathVariable int ordem, @Valid @RequestBody ResultadoReq req) {
        Patrocinador p = acesso.acessarAba(pid, Aba.PESQUISA);
        PerguntaPesquisa q = obterOuCriar(p, ordem);
        q.setResultado(req.resultado());
        historico.registrar(p, "SALVOU_RESULTADO_PESQUISA", "Pergunta " + ordem);
        return PerguntaRes.of(q);
    }

    private PerguntaPesquisa obterOuCriar(Patrocinador p, int ordem) {
        if (ordem < 1 || ordem > 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A ordem da pergunta deve ser 1, 2 ou 3");
        }
        return repo.findByPatrocinadorIdAndOrdem(p.getId(), ordem).orElseGet(() -> {
            PerguntaPesquisa novo = new PerguntaPesquisa();
            novo.setPatrocinador(p);
            novo.setOrdem(ordem);
            return repo.save(novo);
        });
    }
}
