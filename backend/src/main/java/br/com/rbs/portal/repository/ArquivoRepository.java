package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.Aba;
import br.com.rbs.portal.domain.Arquivo;
import br.com.rbs.portal.domain.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ArquivoRepository extends JpaRepository<Arquivo, Long> {
    List<Arquivo> findByPatrocinadorIdOrderByCriadoEmDesc(Long patrocinadorId);

    List<Arquivo> findByPatrocinadorIdAndAbaOrderByCriadoEmDesc(Long patrocinadorId, Aba aba);

    List<Arquivo> findByPatrocinadorIdAndCategoriaOrderByCriadoEmDesc(Long patrocinadorId, Categoria categoria);

    long countByPatrocinadorId(Long patrocinadorId);

    long countByPatrocinadorIdAndCategoria(Long patrocinadorId, Categoria categoria);
}
