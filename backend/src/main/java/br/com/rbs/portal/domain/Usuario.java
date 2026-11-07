package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * E-mail liberado pela RBS. Admin RBS não tem patrocinador; Admin Patrocinador pertence a exatamente um.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String senhaHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "perfil", nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.EAGER)
    private Patrocinador patrocinador;

    private boolean ativo = true;
}
