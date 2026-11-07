package br.com.rbs.portal.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** As 3 perguntas personalizadas a que o patrocinador tem direito, e o resultado subido após o evento. */
@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"patrocinador_id", "ordem"}))
@Getter
@Setter
@NoArgsConstructor
public class PerguntaPesquisa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    private Patrocinador patrocinador;

    /** 1..3 */
    @Column(nullable = false)
    private int ordem;

    @Column(length = 1000)
    private String pergunta;

    @Column(length = 4000)
    private String resultado;
}
