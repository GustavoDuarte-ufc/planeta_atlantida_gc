package br.com.rbs.portal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class SenhaDtos {

    private SenhaDtos() {
    }

    public record EsqueciReq(@NotBlank @Email String email) {
    }

    public record RedefinirReq(@NotBlank String token,
                               @NotBlank @Size(min = 8, max = 100, message = "A senha deve ter de 8 a 100 caracteres") String senha) {
    }

    public record TrocarReq(@NotBlank String senhaAtual,
                            @NotBlank @Size(min = 8, max = 100, message = "A senha deve ter de 8 a 100 caracteres") String novaSenha) {
    }
}
