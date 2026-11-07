package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Cortesia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    private Patrocinador patrocinador;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Setor setor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoCortesia tipo;

    /** Definido pela RBS. */
    private int quantidade;

    /** Quanto o cliente já "destinou". */
    private int destinada;

    @Column(length = 2000)
    private String observacao;
}
