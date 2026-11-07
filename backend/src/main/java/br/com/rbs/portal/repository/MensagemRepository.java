package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.Mensagem;
import br.com.rbs.portal.domain.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MensagemRepository extends JpaRepository<Mensagem, Long> {
    List<Mensagem> findByPatrocinadorIdOrderByCriadoEmAsc(Long patrocinadorId);

    long countByPatrocinadorIdAndAutorRoleAndLidaFalse(Long patrocinadorId, Role autorRole);

    long countByAutorRoleAndLidaFalse(Role autorRole);

    List<Mensagem> findByPatrocinadorIdAndAutorRoleAndLidaFalse(Long patrocinadorId, Role autorRole);
}
