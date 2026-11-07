package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.FaqItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FaqItemRepository extends JpaRepository<FaqItem, Long> {
    List<FaqItem> findByAtivoTrueOrderByCategoriaAscIdAsc();

    List<FaqItem> findAllByOrderByCategoriaAscIdAsc();
}
