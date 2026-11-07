package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.ConhecimentoDoc;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConhecimentoDocRepository extends JpaRepository<ConhecimentoDoc, Long> {
    List<ConhecimentoDoc> findAllByOrderByCriadoEmDesc();
}
