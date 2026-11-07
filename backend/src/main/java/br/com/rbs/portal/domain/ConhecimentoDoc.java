package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Texto do manual de operações (ou outro documento) usado pelo assistente para responder dúvidas. */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class ConhecimentoDoc {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titulo;

    @Column(nullable = false, length = 500000)
    private String conteudo;

    private Instant criadoEm = Instant.now();
}
