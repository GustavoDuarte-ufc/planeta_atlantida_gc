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
public class Arquivo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    private Patrocinador patrocinador;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Aba aba;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Categoria categoria;

    @Column(nullable = false)
    private String nomeOriginal;

    /** Nome (UUID) no disco; nunca exposto ao cliente. */
    @Column(nullable = false)
    private String nomeArmazenado;

    private String contentType;
    private long tamanho;

    @Column(nullable = false)
    private String enviadoPor;

    @Enumerated(EnumType.STRING)
    @Column(name = "origem", nullable = false)
    private Role origem;

    private Instant criadoEm = Instant.now();
}
