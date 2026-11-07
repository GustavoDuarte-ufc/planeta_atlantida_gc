package br.com.rbs.portal.dto;

import br.com.rbs.portal.domain.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class ContratoDtos {

    private ContratoDtos() {
    }

    public record ModeloReq(@NotBlank @Size(max = 200) String nome,
                            @Size(max = 1000) String descricao,
                            @NotBlank @Size(max = 50000, message = "O modelo pode ter até 50.000 caracteres") String corpo,
                            Cota cota,
                            Boolean ativo) {
    }

    public record ModeloRes(Long id, String nome, String descricao, String corpo, Cota cota, String cotaLabel,
                            boolean ativo, Instant atualizadoEm, List<String> variaveis) {
    }

    public record VariavelRes(String chave, String descricao, String exemplo) {
    }

    /** Valores digitados à mão para variáveis que o portal não conseguiu preencher sozinho. */
    public record GerarReq(@NotNull Long modeloId, @Size(max = 200) String titulo,
                           Map<String, @Size(max = 2000) String> valores, boolean ignorarPendentes) {
    }

    public record PreviaRes(String texto, List<String> pendentes, Map<String, String> valores) {
    }

    public record ContratoRes(Long id, Long patrocinadorId, String titulo, String modeloNome, StatusContrato status,
                              String statusLabel, boolean visivelCliente, int versao, String conteudo,
                              String criadoPor, Instant criadoEm) {
        public static ContratoRes of(ContratoGerado c) {
            return new ContratoRes(c.getId(), c.getPatrocinador().getId(), c.getTitulo(), c.getModeloNome(),
                    c.getStatus(), c.getStatus().getLabel(), c.isVisivelCliente(), c.getVersao(), c.getConteudo(),
                    c.getCriadoPor(), c.getCriadoEm());
        }
    }

    public record ContratoPatch(StatusContrato status, Boolean visivelCliente) {
    }
}
