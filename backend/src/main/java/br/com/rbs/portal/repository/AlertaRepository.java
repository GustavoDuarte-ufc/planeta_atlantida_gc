package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.Alerta;
import br.com.rbs.portal.domain.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertaRepository extends JpaRepository<Alerta, Long> {
    boolean existsByChave(String chave);

    List<Alerta> findTop100ByDestinoOrderByCriadoEmDesc(Role destino);

    List<Alerta> findTop100ByDestinoAndPatrocinadorIdOrderByCriadoEmDesc(Role destino, Long patrocinadorId);
}
