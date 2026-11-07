package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.ContratoGerado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContratoGeradoRepository extends JpaRepository<ContratoGerado, Long> {
    List<ContratoGerado> findByPatrocinadorIdOrderByCriadoEmDesc(Long patrocinadorId);

    List<ContratoGerado> findByPatrocinadorIdAndVisivelClienteTrueOrderByCriadoEmDesc(Long patrocinadorId);

    long countByPatrocinadorIdAndModeloId(Long patrocinadorId, Long modeloId);
}
