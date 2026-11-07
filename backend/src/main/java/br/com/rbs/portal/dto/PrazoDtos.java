package br.com.rbs.portal.dto;

import br.com.rbs.portal.domain.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

public final class PrazoDtos {

    private PrazoDtos() {
    }

    public record PrazoReq(@NotBlank @Size(max = 200) String titulo,
                           @Size(max = 1000) String descricao,
                           @NotNull LocalDate dataLimite,
                           TipoEntrega tipo) {
    }

    public record ConcluidoReq(boolean concluido) {
    }

    public record PrazoRes(Long id, Long patrocinadorId, String patrocinador, TipoEntrega tipo, String titulo,
                           String descricao, LocalDate dataLimite, Aba aba, String abaLabel, StatusPrazo status,
                           boolean entregue, long diasRestantes, boolean automatico) {
    }

    public record AlertaRes(Long id, TipoAlerta tipo, String titulo, String mensagem, Long patrocinadorId,
                            String patrocinador, Instant criadoEm, boolean lida) {
    }
}
