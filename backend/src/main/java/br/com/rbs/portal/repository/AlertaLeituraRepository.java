package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.AlertaLeitura;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface AlertaLeituraRepository extends JpaRepository<AlertaLeitura, Long> {
    List<AlertaLeitura> findByUsuarioIdAndAlertaIdIn(Long usuarioId, Collection<Long> alertaIds);

    boolean existsByUsuarioIdAndAlertaId(Long usuarioId, Long alertaId);
}
