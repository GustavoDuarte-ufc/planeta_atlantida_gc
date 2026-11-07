package br.com.rbs.portal.instagram;

import java.time.LocalDate;

/** Uma linha da coleção de perfis: foto diária de um perfil. */
public record PerfilDia(String username, LocalDate data, Long seguidores, Long publicacoes) {
}
