package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/** Uma edição do evento (ex.: Planeta Atlântida 2027). Cada patrocinador pertence a um evento. */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class Evento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String nome;

    /** Primeiro dia do evento: os prazos padrão contam a partir dele. */
    @Column(nullable = false)
    private LocalDate inicio;

    private LocalDate fim;

    @Column(length = 200)
    private String local;

    @Column(length = 1000)
    private String descricao;

    private Instant criadoEm = Instant.now();

    public LocalDate getFimOuInicio() {
        return fim != null ? fim : inicio;
    }
}
