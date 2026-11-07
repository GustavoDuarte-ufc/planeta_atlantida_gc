package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Token de recuperação de senha. Só o hash SHA-256 é guardado; o token em si vai apenas no e-mail. */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class TokenSenha {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    private Usuario usuario;

    @Column(nullable = false, unique = true)
    private String tokenHash;

    @Column(nullable = false)
    private Instant expiraEm;

    private Instant usadoEm;
}
