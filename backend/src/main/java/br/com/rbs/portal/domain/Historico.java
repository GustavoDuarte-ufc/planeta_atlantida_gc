package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Histórico de atualizações (quem fez o quê e quando) por patrocinador. */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class Historico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    private Patrocinador patrocinador;

    @Column(nullable = false)
    private String usuario;

    @Column(nullable = false)
    private String acao;

    @Column(length = 1000)
    private String detalhe;

    private Instant criadoEm = Instant.now();
}
