package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.Prazo;
import br.com.rbs.portal.domain.TipoEntrega;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrazoRepository extends JpaRepository<Prazo, Long> {
    List<Prazo> findAllByOrderByDataLimiteAsc();

    List<Prazo> findByPatrocinadorIdOrderByDataLimiteAsc(Long patrocinadorId);

    boolean existsByPatrocinadorIdAndTipo(Long patrocinadorId, TipoEntrega tipo);
}
