package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Notificação dentro do portal. {@code destino} diz quem vê: os usuários da RBS ou os do patrocinador.
 * {@code chave} evita alertas repetidos (o job diário roda todo dia, o alerta de cada marco sai uma vez).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class Alerta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    private Patrocinador patrocinador;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role destino;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoAlerta tipo;

    @Column(nullable = false)
    private String titulo;

    @Column(length = 1000)
    private String mensagem;

    @Column(unique = true)
    private String chave;

    private Instant criadoEm = Instant.now();
}
