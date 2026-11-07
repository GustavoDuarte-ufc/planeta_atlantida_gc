package br.com.rbs.portal.dto;

import br.com.rbs.portal.domain.*;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.List;

/** Contratos da API (requests e responses). Entidades nunca são expostas diretamente. */
public final class Dtos {

    private Dtos() {
    }

    // ---- Auth
    public record LoginReq(@NotBlank @Email String email, @NotBlank String senha) {
    }

    public record LoginRes(String token, String nome, String email, Role role, Long patrocinadorId, String frontendSponsorId) {
    }

    // ---- Patrocinador
    public record PatrocinadorReq(@NotBlank @Size(max = 200) String nome, @NotNull Cota cota,
                                  @Size(max = 60) String instagram, Long eventoId) {
    }

    public record PatrocinadorRes(Long id, String nome, Cota cota, String cotaLabel, List<Aba> abasPermitidas,
                                  int progresso, List<Aba> abasConcluidas, String instagram,
                                  Long eventoId, String eventoNome) {
        public static PatrocinadorRes of(Patrocinador p, int progresso) {
            return of(p, progresso, List.of());
        }

        public static PatrocinadorRes of(Patrocinador p, int progresso, List<Aba> abasConcluidas) {
            return new PatrocinadorRes(p.getId(), p.getNome(), p.getCota(), p.getCota().getLabel(),
                    List.copyOf(p.getCota().getAbas()), progresso, abasConcluidas, p.getInstagram(),
                    p.getEvento() == null ? null : p.getEvento().getId(),
                    p.getEvento() == null ? null : p.getEvento().getNome());
        }
    }

    // ---- Usuário (e-mail liberado)
    public record UsuarioReq(@NotBlank @Size(max = 200) String nome,
                             @NotBlank @Email String email,
                             @NotBlank @Size(min = 8, max = 100, message = "A senha deve ter de 8 a 100 caracteres") String senha) {
    }

    public record SenhaReq(@NotBlank @Size(min = 8, max = 100, message = "A senha deve ter de 8 a 100 caracteres") String senha) {
    }

    public record UsuarioRes(Long id, String nome, String email, boolean ativo) {
        public static UsuarioRes of(Usuario u) {
            return new UsuarioRes(u.getId(), u.getNome(), u.getEmail(), u.isAtivo());
        }
    }

    // ---- Arquivos
    public record ArquivoRes(Long id, Aba aba, Categoria categoria, String nomeOriginal, long tamanho,
                             String enviadoPor, Role origem, Instant criadoEm) {
        public static ArquivoRes of(Arquivo a) {
            return new ArquivoRes(a.getId(), a.getAba(), a.getCategoria(), a.getNomeOriginal(), a.getTamanho(),
                    a.getEnviadoPor(), a.getOrigem(), a.getCriadoEm());
        }
    }

    // ---- Itens (texto/link)
    public record ItemReq(@NotNull TipoItem tipo, @NotBlank @Size(max = 250) String titulo,
                          @Size(max = 4000) String conteudo) {
    }

    public record ItemRes(Long id, TipoItem tipo, String titulo, String conteudo, String criadoPor, Instant criadoEm) {
        public static ItemRes of(ItemConteudo i) {
            return new ItemRes(i.getId(), i.getTipo(), i.getTitulo(), i.getConteudo(), i.getCriadoPor(), i.getCriadoEm());
        }
    }

    // ---- Cortesias
    public record CortesiaReq(@NotNull Setor setor, @NotNull TipoCortesia tipo, @Min(0) @Max(100000) int quantidade) {
    }

    public record DestinarReq(@Min(0) @Max(100000) int destinada, @Size(max = 2000) String observacao) {
    }

    public record CortesiaRes(Long id, Setor setor, TipoCortesia tipo, int quantidade, int destinada,
                              String observacao) {
        public static CortesiaRes of(Cortesia c) {
            return new CortesiaRes(c.getId(), c.getSetor(), c.getTipo(), c.getQuantidade(), c.getDestinada(),
                    c.getObservacao());
        }
    }

    // ---- Credenciamento
    public record CredReq(@NotNull Setor setor, @Min(0) @Max(100000) int quantidade) {
    }

    public record CredRes(Long id, Setor setor, int quantidade) {
        public static CredRes of(Credenciamento c) {
            return new CredRes(c.getId(), c.getSetor(), c.getQuantidade());
        }
    }

    // ---- Pesquisa
    public record PerguntaReq(@NotBlank @Size(max = 1000) String pergunta) {
    }

    public record ResultadoReq(@Size(max = 4000) String resultado) {
    }

    public record PerguntaRes(int ordem, String pergunta, String resultado) {
        public static PerguntaRes of(PerguntaPesquisa p) {
            return new PerguntaRes(p.getOrdem(), p.getPergunta(), p.getResultado());
        }
    }

    // ---- Histórico
    public record HistoricoRes(Long id, String usuario, String acao, String detalhe, Instant criadoEm) {
        public static HistoricoRes of(Historico h) {
            return new HistoricoRes(h.getId(), h.getUsuario(), h.getAcao(), h.getDetalhe(), h.getCriadoEm());
        }
    }
}
