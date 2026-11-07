package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.Historico;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HistoricoRepository extends JpaRepository<Historico, Long> {
    List<Historico> findTop100ByOrderByCriadoEmDesc();

    List<Historico> findTop200ByPatrocinadorIdOrderByCriadoEmDesc(Long patrocinadorId);
}
