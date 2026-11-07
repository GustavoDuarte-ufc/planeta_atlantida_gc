package br.com.rbs.portal.dto;

import br.com.rbs.portal.domain.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class ConhecimentoDtos {

    private ConhecimentoDtos() {
    }

    public record FaqReq(@NotBlank @Size(max = 500) String pergunta,
                         @NotBlank @Size(max = 4000) String resposta,
                         @Size(max = 100) String categoria,
                         Boolean ativo) {
    }

    public record FaqRes(Long id, String pergunta, String resposta, String categoria, boolean ativo) {
        public static FaqRes of(FaqItem f) {
            return new FaqRes(f.getId(), f.getPergunta(), f.getResposta(), f.getCategoria(), f.isAtivo());
        }
    }

    public record DocReq(@NotBlank @Size(max = 200) String titulo,
                         @NotBlank @Size(max = 400000) String conteudo) {
    }

    public record DocRes(Long id, String titulo, int caracteres, Instant criadoEm) {
        public static DocRes of(ConhecimentoDoc d) {
            return new DocRes(d.getId(), d.getTitulo(), d.getConteudo().length(), d.getCriadoEm());
        }
    }

    public record PerguntarReq(@NotBlank @Size(max = 800) String pergunta) {
    }

    public record Fonte(String titulo, String trecho) {
    }

    /** modo: BASE (resposta vinda do FAQ/manual), IA (redigida pelo modelo a partir da base) ou SEM_RESPOSTA. */
    public record RespostaRes(String resposta, String modo, List<Fonte> fontes) {
    }

    public record PerguntaLogRes(Long id, String usuario, String pergunta, String modo, Instant criadoEm) {
        public static PerguntaLogRes of(FaqPergunta p) {
            return new PerguntaLogRes(p.getId(), p.getUsuario(), p.getPergunta(), p.getModo(), p.getCriadoEm());
        }
    }
}
