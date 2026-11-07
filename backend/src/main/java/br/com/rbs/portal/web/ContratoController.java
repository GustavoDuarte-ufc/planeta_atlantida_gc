package br.com.rbs.portal.web;

import br.com.rbs.portal.dto.ContratoDtos.*;
import br.com.rbs.portal.service.ContratoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ContratoController {

    private final ContratoService service;

    // ---- Modelos (somente RBS)

    @GetMapping("/contratos/modelos")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public List<ModeloRes> modelos() {
        return service.listarModelos();
    }

    @PostMapping("/contratos/modelos")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public ModeloRes criarModelo(@Valid @RequestBody ModeloReq req) {
        return service.salvarModelo(null, req);
    }

    @PutMapping("/contratos/modelos/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public ModeloRes atualizarModelo(@PathVariable Long id, @Valid @RequestBody ModeloReq req) {
        return service.salvarModelo(id, req);
    }

    @DeleteMapping("/contratos/modelos/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public void arquivarModelo(@PathVariable Long id) {
        service.arquivarModelo(id);
    }

    @GetMapping("/contratos/variaveis")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public List<VariavelRes> variaveis() {
        return ContratoService.CATALOGO;
    }

    // ---- Contratos de um patrocinador

    @GetMapping("/patrocinadores/{pid}/contratos")
    public List<ContratoRes> listar(@PathVariable Long pid) {
        return service.listar(pid);
    }

    @PostMapping("/patrocinadores/{pid}/contratos/previa")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public PreviaRes previa(@PathVariable Long pid, @Valid @RequestBody GerarReq req) {
        return service.previa(pid, req);
    }

    @PostMapping("/patrocinadores/{pid}/contratos")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public ContratoRes gerar(@PathVariable Long pid, @Valid @RequestBody GerarReq req) {
        return service.gerar(pid, req);
    }

    @PatchMapping("/contratos/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public ContratoRes atualizar(@PathVariable Long id, @RequestBody ContratoPatch patch) {
        return service.atualizar(id, patch);
    }

    @DeleteMapping("/contratos/{id}")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public void remover(@PathVariable Long id) {
        service.remover(id);
    }
}
