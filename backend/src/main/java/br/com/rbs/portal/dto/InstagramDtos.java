package br.com.rbs.portal.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class InstagramDtos {

    private InstagramDtos() {
    }

    public record PontoSerie(LocalDate data, long seguidores) {
    }

    public record PostRes(String id, String url, String legenda, String tipo, long curtidas, long comentarios,
                          long compartilhamentos, long interacoes, double engajamentoPct, Instant publicadoEm) {
    }

    public record TipoStat(String tipo, int posts, double mediaInteracoes) {
    }

    public record DiaStat(String dia, int posts, double mediaInteracoes) {
    }

    /** Números de um perfil. Campos nulos = sem dados suficientes (nunca zero inventado). */
    public record Resumo(String username, boolean temDados, LocalDate dataReferencia, Long seguidores, Long publicacoes,
                         Long variacao7, Long variacao30, Double crescimento30Pct, int dias, int postsPeriodo,
                         double mediaCurtidas, double mediaComentarios, double engajamentoPct,
                         List<PontoSerie> serie, List<PostRes> topPosts, List<TipoStat> porTipo,
                         List<DiaStat> porDiaSemana, Integer melhorHorario, Instant atualizadoEm) {
    }

    public record Mencoes(int total, long interacoes, List<PostRes> posts) {
    }

    /** Resposta das telas. {@code habilitado=false}: MongoDB não configurado; {@code erro}: falha ao consultar. */
    public record InstagramRes(boolean habilitado, String erro, String eventoUsername, String handle,
                               Resumo perfil, Mencoes mencoes) {
    }
}
