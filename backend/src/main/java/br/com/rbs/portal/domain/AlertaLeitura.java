package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Marca que um usuário já leu um alerta (a leitura é individual). */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class AlertaLeitura {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long alertaId;

    @Column(nullable = false)
    private Long usuarioId;
}
