package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Mensagem na conversa entre uma marca e a equipe RBS (uma conversa por patrocinador). */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class Mensagem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    private Patrocinador patrocinador;

    @Column(nullable = false)
    private String autorNome;

    /** Quem escreveu: ADMIN_PATROCINADOR (marca) ou ADMIN_RBS. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role autorRole;

    @Column(length = 200)
    private String assunto;

    @Column(nullable = false, length = 4000)
    private String texto;

    /** Já vista pelo outro lado da conversa. */
    private boolean lida = false;

    private Instant criadoEm = Instant.now();
}
