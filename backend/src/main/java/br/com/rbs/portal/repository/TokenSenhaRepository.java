package br.com.rbs.portal.repository;

import br.com.rbs.portal.domain.TokenSenha;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TokenSenhaRepository extends JpaRepository<TokenSenha, Long> {
    Optional<TokenSenha> findByTokenHash(String tokenHash);

    List<TokenSenha> findByUsuarioIdAndUsadoEmIsNull(Long usuarioId);
}
