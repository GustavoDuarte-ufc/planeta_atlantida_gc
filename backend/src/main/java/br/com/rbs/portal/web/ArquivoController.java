package br.com.rbs.portal.web;

import br.com.rbs.portal.domain.Aba;
import br.com.rbs.portal.domain.Arquivo;
import br.com.rbs.portal.domain.Categoria;
import br.com.rbs.portal.domain.Patrocinador;
import br.com.rbs.portal.dto.Dtos.ArquivoRes;
import br.com.rbs.portal.repository.ArquivoRepository;
import br.com.rbs.portal.service.AcessoService;
import br.com.rbs.portal.service.ArquivoService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ArquivoController {

    private final ArquivoService service;
    private final ArquivoRepository repo;
    private final AcessoService acesso;

    @GetMapping("/patrocinadores/{pid}/arquivos")
    public List<ArquivoRes> listar(@PathVariable Long pid, @RequestParam(required = false) Aba aba) {
        List<Arquivo> lista;
        if (aba != null) {
            acesso.acessarAba(pid, aba);
            lista = repo.findByPatrocinadorIdAndAbaOrderByCriadoEmDesc(pid, aba);
        } else {
            Patrocinador p = acesso.acessar(pid);
            lista = repo.findByPatrocinadorIdOrderByCriadoEmDesc(pid).stream()
                    .filter(a -> p.getCota().permite(a.getAba())).toList();
        }
        return lista.stream().map(ArquivoRes::of).toList();
    }

    @PostMapping(value = "/patrocinadores/{pid}/arquivos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ArquivoRes enviar(@PathVariable Long pid, @RequestParam Categoria categoria,
                             @RequestPart("arquivo") MultipartFile arquivo) {
        return ArquivoRes.of(service.salvar(pid, categoria, arquivo));
    }

    @GetMapping("/arquivos/{id}/download")
    public ResponseEntity<Resource> baixar(@PathVariable Long id) {
        Arquivo a = service.buscar(id);
        Resource r = service.recurso(a);
        MediaType tipo = MediaType.APPLICATION_OCTET_STREAM;
        if (a.getContentType() != null) {
            try {
                tipo = MediaType.parseMediaType(a.getContentType());
            } catch (Exception ignored) {
                // mantém octet-stream
            }
        }
        return ResponseEntity.ok()
                .contentType(tipo)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(a.getNomeOriginal(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(r);
    }

    @DeleteMapping("/arquivos/{id}")
    public void remover(@PathVariable Long id) {
        service.remover(id);
    }
}
