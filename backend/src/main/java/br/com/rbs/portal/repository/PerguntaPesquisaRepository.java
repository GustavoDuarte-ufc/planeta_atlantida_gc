package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.PerguntaPesquisa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PerguntaPesquisaRepository extends JpaRepository<PerguntaPesquisa, Long> {
    List<PerguntaPesquisa> findByPatrocinadorIdOrderByOrdem(Long patrocinadorId);

    Optional<PerguntaPesquisa> findByPatrocinadorIdAndOrdem(Long patrocinadorId, int ordem);
}
