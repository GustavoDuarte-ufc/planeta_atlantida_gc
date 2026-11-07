package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.Patrocinador;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PatrocinadorRepository extends JpaRepository<Patrocinador, Long> {
    List<Patrocinador> findByEventoId(Long eventoId, Sort sort);

    List<Patrocinador> findByEventoIsNull();

    java.util.Optional<Patrocinador> findByFrontendId(String frontendId);

    long countByEventoId(Long eventoId);
}
