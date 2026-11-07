package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Modelo de contrato configurável pela RBS. O corpo usa variáveis no formato {{patrocinador.nome}}. */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class ModeloContrato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(length = 1000)
    private String descricao;

    @Column(nullable = false, length = 60000)
    private String corpo;

    /** Se preenchida, o modelo só é oferecido para patrocinadores dessa cota. */
    @Enumerated(EnumType.STRING)
    private Cota cota;

    private boolean ativo = true;

    private Instant atualizadoEm = Instant.now();
}
