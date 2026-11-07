package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.FaqPergunta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FaqPerguntaRepository extends JpaRepository<FaqPergunta, Long> {
    List<FaqPergunta> findTop200ByOrderByCriadoEmDesc();
}
