package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/** Prazo de entrega de um patrocinador. O status (entregue/atrasado...) é calculado, não gravado. */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class Prazo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    private Patrocinador patrocinador;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoEntrega tipo;

    @Column(nullable = false)
    private String titulo;

    @Column(length = 1000)
    private String descricao;

    @Column(nullable = false)
    private LocalDate dataLimite;

    /** Só usado em prazos PERSONALIZADO. */
    private boolean concluidoManual;
}
