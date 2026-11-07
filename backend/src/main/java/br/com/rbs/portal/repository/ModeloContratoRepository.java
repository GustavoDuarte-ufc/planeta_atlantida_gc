package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.ModeloContrato;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModeloContratoRepository extends JpaRepository<ModeloContrato, Long> {
    List<ModeloContrato> findAllByOrderByNomeAsc();
}
