package br.com.rbs.portal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public final class EventoDtos {

    private EventoDtos() {
    }

    public record EventoReq(@NotBlank @Size(max = 200) String nome, @NotNull LocalDate inicio, LocalDate fim,
                            @Size(max = 200) String local, @Size(max = 1000) String descricao) {
    }

    /** status: PLANEJADO, EM_ANDAMENTO ou ENCERRADO (calculado pela data). */
    public record EventoRes(Long id, String nome, LocalDate inicio, LocalDate fim, String local, String descricao,
                            String status, long diasParaInicio, int marcas, int progressoMedio) {
    }
}
