package br.com.rbs.portal.web;

import br.com.rbs.portal.domain.Patrocinador;
import br.com.rbs.portal.domain.Role;
import br.com.rbs.portal.domain.Usuario;
import br.com.rbs.portal.dto.Dtos.SenhaReq;
import br.com.rbs.portal.dto.Dtos.UsuarioReq;
import br.com.rbs.portal.dto.Dtos.UsuarioRes;
import br.com.rbs.portal.repository.UsuarioRepository;
import br.com.rbs.portal.service.AcessoService;
import br.com.rbs.portal.service.HistoricoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** E-mails liberados de cada patrocinador. Cadastro/alteração: somente Admin RBS. */
@RestController
@RequestMapping("/api/patrocinadores/{pid}/usuarios")
@RequiredArgsConstructor
@Transactional
public class UsuarioController {

    private final UsuarioRepository repo;
    private final AcessoService acesso;
    private final HistoricoService historico;
    private final PasswordEncoder encoder;

    @GetMapping
    public List<UsuarioRes> listar(@PathVariable Long pid) {
        acesso.acessar(pid);
        return repo.findByPatrocinadorIdOrderByNome(pid).stream().map(UsuarioRes::of).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public UsuarioRes criar(@PathVariable Long pid, @Valid @RequestBody UsuarioReq req) {
        Patrocinador p = acesso.acessar(pid);
        String email = req.email().trim().toLowerCase();
        if (repo.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        }
        Usuario u = new Usuario();
        u.setNome(req.nome().trim());
        u.setEmail(email);
        u.setSenhaHash(encoder.encode(req.senha()));
        u.setRole(Role.ADMIN_PATROCINADOR);
        u.setPatrocinador(p);
        repo.save(u);
        historico.registrar(p, "LIBEROU_EMAIL", email);
        return UsuarioRes.of(u);
    }

    @PatchMapping("/{uid}/ativo")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public UsuarioRes ativar(@PathVariable Long pid, @PathVariable Long uid, @RequestParam boolean valor) {
        Patrocinador p = acesso.acessar(pid);
        Usuario u = doPatrocinador(pid, uid);
        u.setAtivo(valor);
        historico.registrar(p, valor ? "REATIVOU_EMAIL" : "BLOQUEOU_EMAIL", u.getEmail());
        return UsuarioRes.of(u);
    }

    @PutMapping("/{uid}/senha")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public void redefinirSenha(@PathVariable Long pid, @PathVariable Long uid, @Valid @RequestBody SenhaReq req) {
        Patrocinador p = acesso.acessar(pid);
        Usuario u = doPatrocinador(pid, uid);
        u.setSenhaHash(encoder.encode(req.senha()));
        historico.registrar(p, "REDEFINIU_SENHA", u.getEmail());
    }

    private Usuario doPatrocinador(Long pid, Long uid) {
        Usuario u = repo.findById(uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));
        if (u.getPatrocinador() == null || !u.getPatrocinador().getId().equals(pid)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado");
        }
        return u;
    }
}
