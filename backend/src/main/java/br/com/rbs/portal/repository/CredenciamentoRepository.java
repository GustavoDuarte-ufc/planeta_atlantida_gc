package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.Credenciamento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CredenciamentoRepository extends JpaRepository<Credenciamento, Long> {
    List<Credenciamento> findByPatrocinadorIdOrderBySetorAsc(Long patrocinadorId);
}
