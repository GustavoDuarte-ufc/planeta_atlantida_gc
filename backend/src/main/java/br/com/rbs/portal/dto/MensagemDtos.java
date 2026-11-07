package br.com.rbs.portal.dto;

import br.com.rbs.portal.domain.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class MensagemDtos {

    private MensagemDtos() {
    }

    public record MensagemReq(@Size(max = 200) String assunto, @NotBlank @Size(max = 4000) String texto) {
    }

    public record MensagemRes(Long id, String autor, Role autorRole, String assunto, String texto, Instant criadoEm,
                              boolean minha) {
    }

    /** Uma linha da caixa de entrada da RBS. */
    public record ConversaRes(Long patrocinadorId, String patrocinador, String eventoNome, String ultimaMensagem,
                              Instant ultimaEm, boolean ultimaDaRbs, long naoLidas) {
    }
}
