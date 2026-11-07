package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.Cortesia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CortesiaRepository extends JpaRepository<Cortesia, Long> {
    List<Cortesia> findByPatrocinadorIdOrderBySetorAscTipoAsc(Long patrocinadorId);
}
