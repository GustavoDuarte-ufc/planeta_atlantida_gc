package br.com.rbs.portal.web;

import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.dto.Dtos.ItemReq;
import br.com.rbs.portal.dto.Dtos.ItemRes;
import br.com.rbs.portal.repository.ItemConteudoRepository;
import br.com.rbs.portal.service.AcessoService;
import br.com.rbs.portal.service.HistoricoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;

/** Conteúdos em texto/link: materiais em texto (cliente), links de posts (RBS), signatário do contrato (cliente). */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Transactional
public class ItemController {

    private final ItemConteudoRepository repo;
    private final AcessoService acesso;
    private final HistoricoService historico;

    @GetMapping("/patrocinadores/{pid}/itens")
    public List<ItemRes> listar(@PathVariable Long pid, @RequestParam Aba aba) {
        acesso.acessarAba(pid, aba);
        List<TipoItem> tipos = Arrays.stream(TipoItem.values()).filter(t -> t.getAba() == aba).toList();
        return repo.findByPatrocinadorIdAndTipoInOrderByCriadoEmDesc(pid, tipos).stream().map(ItemRes::of).toList();
    }

    @PostMapping("/patrocinadores/{pid}/itens")
    public ItemRes criar(@PathVariable Long pid, @Valid @RequestBody ItemReq req) {
        Patrocinador p = acesso.acessarAba(pid, req.tipo().getAba());
        Usuario u = acesso.atual();
        if (u.getRole() != Role.ADMIN_RBS && !req.tipo().isPatrocinadorPode()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Somente a RBS pode cadastrar este conteúdo");
        }
        ItemConteudo i = new ItemConteudo();
        i.setPatrocinador(p);
        i.setTipo(req.tipo());
        i.setTitulo(req.titulo().trim());
        i.setConteudo(req.conteudo());
        i.setCriadoPor(u.getEmail());
        repo.save(i);
        historico.registrar(p, "ADICIONOU_" + req.tipo().name(), i.getTitulo());
        return ItemRes.of(i);
    }

    @DeleteMapping("/itens/{id}")
    public void remover(@PathVariable Long id) {
        ItemConteudo i = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item não encontrado"));
        Patrocinador p = acesso.acessarAba(i.getPatrocinador().getId(), i.getTipo().getAba());
        Usuario u = acesso.atual();
        if (u.getRole() != Role.ADMIN_RBS && !i.getCriadoPor().equalsIgnoreCase(u.getEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Só é possível remover itens criados por você");
        }
        repo.delete(i);
        historico.registrar(p, "REMOVEU_" + i.getTipo().name(), i.getTitulo());
    }
}
