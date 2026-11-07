package br.com.rbs.portal.instagram;

import java.time.Instant;

/** Uma linha da coleção de posts. Métricas ausentes (null) valem zero nas somas. */
public record PostIg(String id, String username, Long curtidas, Long comentarios, Long compartilhamentos,
                     String legenda, Instant publicadoEm, String tipo, Instant atualizadoEm, String url) {

    public long interacoes() {
        return n(curtidas) + n(comentarios) + n(compartilhamentos);
    }

    private static long n(Long v) {
        return v == null ? 0 : v;
    }
}
