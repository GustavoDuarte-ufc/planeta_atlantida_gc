package br.com.rbs.portal.service;

import br.com.rbs.portal.domain.Aba;
import br.com.rbs.portal.domain.Patrocinador;
import br.com.rbs.portal.domain.Role;
import br.com.rbs.portal.domain.Usuario;
import br.com.rbs.portal.repository.PatrocinadorRepository;
import br.com.rbs.portal.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Regra central de isolamento: cada patrocinador só enxerga o próprio projeto
 * e somente as abas liberadas pela sua cota. Admin RBS enxerga todos.
 */
@Service
@RequiredArgsConstructor
public class AcessoService {

    private final UsuarioRepository usuarios;
    private final PatrocinadorRepository patrocinadores;

    public Usuario atual() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return usuarios.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    public boolean isRbs() {
        return atual().getRole() == Role.ADMIN_RBS;
    }

    /** Retorna o patrocinador se o usuário atual puder acessá-lo; 404/403 caso contrário. */
    public Patrocinador acessar(Long patrocinadorId) {
        Usuario u = atual();
        Patrocinador p = patrocinadores.findById(patrocinadorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patrocinador não encontrado"));
        if (u.getRole() != Role.ADMIN_RBS) {
            if (u.getPatrocinador() == null || !u.getPatrocinador().getId().equals(patrocinadorId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sem acesso a este patrocinador");
            }
        }
        return p;
    }

    /** Além de acessar o patrocinador, exige que a cota dele inclua a aba. */
    public Patrocinador acessarAba(Long patrocinadorId, Aba aba) {
        Patrocinador p = acessar(patrocinadorId);
        if (!p.getCota().permite(aba)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A aba não está disponível para esta cota");
        }
        return p;
    }

    public void exigirRbs() {
        if (!isRbs()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas Admin RBS");
        }
    }
}
