package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Registro das perguntas feitas ao assistente: mostra à RBS o que falta no FAQ/manual. */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class FaqPergunta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String usuario;

    @Column(nullable = false, length = 1000)
    private String pergunta;

    @Column(length = 8000)
    private String resposta;

    /** BASE (FAQ/manual), IA ou SEM_RESPOSTA. */
    @Column(nullable = false)
    private String modo;

    private Instant criadoEm = Instant.now();
}
