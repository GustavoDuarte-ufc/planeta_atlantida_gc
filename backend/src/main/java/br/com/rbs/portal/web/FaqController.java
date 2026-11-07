package br.com.rbs.portal.web;

import br.com.rbs.portal.domain.ConhecimentoDoc;
import br.com.rbs.portal.domain.FaqItem;
import br.com.rbs.portal.dto.ConhecimentoDtos.*;
import br.com.rbs.portal.repository.ConhecimentoDocRepository;
import br.com.rbs.portal.repository.FaqItemRepository;
import br.com.rbs.portal.repository.FaqPerguntaRepository;
import br.com.rbs.portal.service.FaqService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FaqController {

    private final FaqItemRepository faq;
    private final ConhecimentoDocRepository docs;
    private final FaqPerguntaRepository perguntas;
    private final FaqService service;

    // ---- Leitura (todos os logados)

    @GetMapping("/faq")
    public List<FaqRes> listar() {
        return faq.findByAtivoTrueOrderByCategoriaAscIdAsc().stream().map(FaqRes::of).toList();
    }

    @PostMapping("/faq/perguntar")
    public RespostaRes perguntar(@Valid @RequestBody PerguntarReq req) {
        return service.perguntar(req.pergunta());
    }

    // ---- Gestão (RBS)

    @GetMapping("/faq/todos")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public List<FaqRes> todos() {
        return faq.findAllByOrderByCategoriaAscIdAsc().stream().map(FaqRes::of).toList();
    }

    @PostMapping("/faq")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public FaqRes criar(@Valid @RequestBody FaqReq req) {
        return FaqRes.of(faq.save(aplicar(new FaqItem(), req)));
    }

    @PutMapping("/faq/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public FaqRes atualizar(@PathVariable Long id, @Valid @RequestBody FaqReq req) {
        FaqItem f = faq.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return FaqRes.of(faq.save(aplicar(f, req)));
    }

    @DeleteMapping("/faq/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public void remover(@PathVariable Long id) {
        faq.deleteById(id);
    }

    @GetMapping("/faq/perguntas")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public List<PerguntaLogRes> historico() {
        return perguntas.findTop200ByOrderByCriadoEmDesc().stream().map(PerguntaLogRes::of).toList();
    }

    // ---- Manual de operações / documentos de conhecimento (RBS)

    @GetMapping("/conhecimento")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public List<DocRes> docs() {
        return docs.findAllByOrderByCriadoEmDesc().stream().map(DocRes::of).toList();
    }

    @PostMapping("/conhecimento")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public DocRes novoDoc(@Valid @RequestBody DocReq req) {
        return DocRes.of(salvarDoc(req.titulo(), req.conteudo()));
    }

    /** Envia um PDF (ou .txt/.md) do manual: o texto é extraído e indexado. PDFs escaneados (imagem) não funcionam. */
    @PostMapping("/conhecimento/arquivo")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public DocRes novoDocArquivo(@RequestParam("arquivo") MultipartFile arquivo,
                                 @RequestParam(value = "titulo", required = false) String titulo) throws IOException {
        String nome = arquivo.getOriginalFilename() == null ? "documento" : arquivo.getOriginalFilename();
        String texto;
        if (nome.toLowerCase().endsWith(".pdf")) {
            try (PDDocument pdf = Loader.loadPDF(arquivo.getBytes())) {
                texto = new PDFTextStripper().getText(pdf);
            }
        } else if (nome.toLowerCase().matches(".*\\.(txt|md)$")) {
            texto = new String(arquivo.getBytes(), StandardCharsets.UTF_8);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie um PDF, .txt ou .md");
        }
        if (texto.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Não foi possível extrair texto (PDF escaneado?). Cole o texto manualmente.");
        }
        if (texto.length() > 400000) {
            texto = texto.substring(0, 400000);
        }
        return DocRes.of(salvarDoc(titulo == null || titulo.isBlank() ? nome : titulo.trim(), texto));
    }

    @DeleteMapping("/conhecimento/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public void removerDoc(@PathVariable Long id) {
        docs.deleteById(id);
    }

    private ConhecimentoDoc salvarDoc(String titulo, String conteudo) {
        ConhecimentoDoc d = new ConhecimentoDoc();
        d.setTitulo(titulo.trim());
        d.setConteudo(conteudo);
        return docs.save(d);
    }

    private static FaqItem aplicar(FaqItem f, FaqReq req) {
        f.setPergunta(req.pergunta().trim());
        f.setResposta(req.resposta().trim());
        f.setCategoria(req.categoria() == null || req.categoria().isBlank() ? "Geral" : req.categoria().trim());
        if (req.ativo() != null) {
            f.setAtivo(req.ativo());
        }
        f.setAtualizadoEm(Instant.now());
        return f;
    }
}
