package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Contrato produzido a partir de um modelo: o texto final fica congelado (não muda se o modelo mudar). */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class ContratoGerado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    private Patrocinador patrocinador;

    private Long modeloId;

    private String modeloNome;

    @Column(nullable = false)
    private String titulo;

    @Column(nullable = false, length = 60000)
    private String conteudo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusContrato status = StatusContrato.MINUTA;

    /** O patrocinador só enxerga contratos publicados pela RBS. */
    private boolean visivelCliente;

    private int versao = 1;

    @Column(nullable = false)
    private String criadoPor;

    private Instant criadoEm = Instant.now();
}
