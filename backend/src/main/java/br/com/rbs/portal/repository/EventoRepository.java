package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.Evento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventoRepository extends JpaRepository<Evento, Long> {
    List<Evento> findAllByOrderByInicioDesc();
}
