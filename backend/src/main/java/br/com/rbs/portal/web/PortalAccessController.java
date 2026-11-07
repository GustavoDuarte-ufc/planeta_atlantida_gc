package br.com.rbs.portal.web;

import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.repository.*;
import br.com.rbs.portal.service.EventoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Vincula o cadastro visual de marcas aos usuários reais autenticados pelo Spring Security. */
@RestController
@RequestMapping("/api/portal-access")
@RequiredArgsConstructor
@Transactional
@PreAuthorize("hasRole('ADMIN_RBS')")
public class PortalAccessController {
    private final PatrocinadorRepository patrocinadores;
    private final UsuarioRepository usuarios;
    private final EventoService eventos;
    private final PasswordEncoder encoder;

    public record AcessoReq(@NotBlank String frontendSponsorId, @NotBlank String sponsorName,
        @NotBlank String tier, @NotBlank String nome, @NotBlank @Email String email,
        String senha, String previousEmail) {}

    @PostMapping("/usuarios")
    public java.util.Map<String,Object> salvar(@Valid @RequestBody AcessoReq req) {
        String email = req.email().trim().toLowerCase(java.util.Locale.ROOT);
        Patrocinador sponsor = patrocinadores.findByFrontendId(req.frontendSponsorId()).orElseGet(() -> {
            Patrocinador novo = new Patrocinador();
            novo.setFrontendId(req.frontendSponsorId());
            novo.setEvento(eventos.padrao());
            return novo;
        });
        sponsor.setNome(req.sponsorName().trim());
        String tier = req.tier().toLowerCase(java.util.Locale.ROOT);
        sponsor.setCota(tier.contains("master") ? Cota.MASTER : tier.contains("g") ? Cota.SUBCOTA_G : Cota.SUBCOTA);
        sponsor = patrocinadores.save(sponsor);
        Usuario usuario = usuarios.findByEmailIgnoreCase(email).orElse(null);
        if (usuario == null && req.previousEmail() != null && !req.previousEmail().isBlank())
            usuario = usuarios.findByEmailIgnoreCase(req.previousEmail()).orElse(null);
        if (usuario != null && (usuario.getRole() == Role.ADMIN_RBS ||
                (usuario.getPatrocinador() != null && !usuario.getPatrocinador().getId().equals(sponsor.getId()))))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já vinculado a outra conta");
        if (usuario == null) usuario = new Usuario();
        if (usuario.getId() == null && (req.senha() == null || req.senha().length() < 8))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe senha de pelo menos 8 caracteres");
        usuario.setNome(req.nome().trim());
        usuario.setEmail(email);
        usuario.setRole(Role.ADMIN_PATROCINADOR);
        usuario.setPatrocinador(sponsor);
        usuario.setAtivo(true);
        if (req.senha() != null && !req.senha().isBlank()) {
            if (req.senha().length() < 8) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha muito curta");
            usuario.setSenhaHash(encoder.encode(req.senha()));
        }
        usuarios.save(usuario);
        return java.util.Map.of("salvo", true);
    }
}
