package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Patrocinador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Cota cota;

    /** @ do Instagram da marca (sem o @, minúsculo). Usado para achar menções e métricas no MongoDB. */
    @Column(length = 60)
    private String instagram;

    /** Evento (edição) a que a marca pertence. */
    @ManyToOne(fetch = FetchType.EAGER)
    private Evento evento;

    @Column(unique = true, length = 120)
    private String frontendId;

    private Instant criadoEm = Instant.now();
}
