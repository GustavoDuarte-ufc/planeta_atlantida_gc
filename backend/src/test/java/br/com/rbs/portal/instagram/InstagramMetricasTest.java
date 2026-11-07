package br.com.rbs.portal.instagram;

import br.com.rbs.portal.dto.InstagramDtos.Resumo;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class InstagramMetricasTest {

    static final ZoneId Z = ZoneId.of("America/Sao_Paulo");
    static final LocalDate HOJE = LocalDate.of(2026, 11, 2);

    static PostIg post(String id, String legenda, long curtidas, Long comentarios, String quando) {
        return new PostIg(id, "x", curtidas, comentarios, null, legenda, Instant.parse(quando), "IMAGE", null, null);
    }

    @Test
    void handleNormalizado() {
        assertEquals("marca.oficial", InstagramService.normalizarHandle(" @Marca.Oficial "));
        assertEquals("marca", InstagramService.normalizarHandle("https://www.instagram.com/marca/?hl=pt"));
        assertNull(InstagramService.normalizarHandle("  "));
        assertNull(InstagramService.normalizarHandle(null));
        assertThrows(IllegalArgumentException.class, () -> InstagramService.normalizarHandle("marca; drop"));
    }

    @Test
    void mencaoNaoConfundeComPerfilParecido() {
        List<PostIg> posts = List.of(
                post("1", "Com @marca no palco", 10, 1L, "2026-10-01T10:00:00Z"),
                post("2", "Com @marcas e @marca.oficial", 10, 1L, "2026-10-02T10:00:00Z"),
                post("3", "email fulano@marca", 10, 1L, "2026-10-03T10:00:00Z"),
                post("4", "Oi @MARCA!", 10, 1L, "2026-10-04T10:00:00Z"),
                post("5", null, 10, 1L, "2026-10-05T10:00:00Z"));
        assertEquals(List.of("1", "4"), InstagramMetricas.mencoes("marca", posts).stream().map(PostIg::id).toList());
        assertTrue(InstagramMetricas.mencoes(null, posts).isEmpty());
    }

    @Test
    void crescimentoEVariacao() {
        List<PerfilDia> perfis = new ArrayList<>();
        for (int i = 0; i <= 40; i++) {
            perfis.add(new PerfilDia("x", HOJE.minusDays(i), 300_000L - i * 100L, 1800L));
        }
        Resumo r = InstagramMetricas.calcular("x", perfis, List.of(), 30, HOJE, Z);
        assertEquals(300_000L, r.seguidores());
        assertEquals(700L, r.variacao7());
        assertEquals(3000L, r.variacao30());
        assertNotNull(r.crescimento30Pct());
        assertEquals(31, r.serie().size());
        assertEquals(HOJE.minusDays(30), r.serie().get(0).data());
    }

    @Test
    void semHistoricoNaoInventaVariacao() {
        Resumo r = InstagramMetricas.calcular("x", List.of(new PerfilDia("x", HOJE, 1000L, 5L)), List.of(), 30, HOJE, Z);
        assertEquals(1000L, r.seguidores());
        assertNull(r.variacao7());
        assertNull(r.variacao30());
        assertNull(r.crescimento30Pct());
    }

    @Test
    void engajamentoUsaNulosComoZero() {
        List<PostIg> posts = List.of(
                post("1", "a", 90, 10L, "2026-10-30T12:00:00Z"),   // 100 interações
                post("2", "b", 50, null, "2026-10-29T12:00:00Z"));  // 50 interações, comentários nulos
        Resumo r = InstagramMetricas.calcular("x", List.of(new PerfilDia("x", HOJE, 1000L, 2L)), posts, 30, HOJE, Z);
        assertEquals(2, r.postsPeriodo());
        assertEquals(70.0, r.mediaCurtidas(), 1e-9);
        assertEquals(7.5, r.engajamentoPct(), 1e-9); // (10% + 5%) / 2
        assertEquals("1", r.topPosts().get(0).id());
    }

    @Test
    void postsAntigosFicamForaDoPeriodo() {
        List<PostIg> posts = List.of(post("velho", "a", 5, 0L, "2026-01-01T00:00:00Z"));
        Resumo r = InstagramMetricas.calcular("x", List.of(), posts, 30, HOJE, Z);
        assertEquals(0, r.postsPeriodo());
        assertTrue(r.temDados());
        assertEquals(1, r.topPosts().size()); // sem posts no período, mostra os mais recentes disponíveis
    }

    @Test
    void conversoesTolerantes() {
        assertEquals(Instant.parse("2026-10-19T23:00:03Z"), MongoInstagramFonte.instante("2026-10-19T23:00:03+0000"));
        assertEquals(Instant.parse("2026-11-02T12:12:16.148640Z"), MongoInstagramFonte.instante("2026-11-02T12:12:16.148640+00:00"));
        assertEquals(LocalDate.of(2026, 10, 20), MongoInstagramFonte.data("2026-10-20"));
        assertEquals(312258L, MongoInstagramFonte.longo(312258.0));
        assertNull(MongoInstagramFonte.longo(null));
        assertNull(MongoInstagramFonte.instante("lixo"));
    }
}
