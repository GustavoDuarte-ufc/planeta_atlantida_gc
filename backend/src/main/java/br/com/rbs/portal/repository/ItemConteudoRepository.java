package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.ItemConteudo;
import br.com.rbs.portal.domain.TipoItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface ItemConteudoRepository extends JpaRepository<ItemConteudo, Long> {
    List<ItemConteudo> findByPatrocinadorIdAndTipoInOrderByCriadoEmDesc(Long patrocinadorId, Collection<TipoItem> tipos);

    long countByPatrocinadorIdAndTipo(Long patrocinadorId, TipoItem tipo);

    List<ItemConteudo> findByPatrocinadorIdAndTipoOrderByCriadoEmDesc(Long patrocinadorId, TipoItem tipo);
}
