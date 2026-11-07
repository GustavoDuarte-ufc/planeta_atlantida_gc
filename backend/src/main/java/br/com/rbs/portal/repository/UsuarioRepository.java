package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<Usuario> findByPatrocinadorIdOrderByNome(Long patrocinadorId);

    long countByPatrocinadorId(Long patrocinadorId);
}
