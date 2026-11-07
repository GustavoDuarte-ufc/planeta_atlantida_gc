package br.com.rbs.portal.instagram;

import br.com.rbs.portal.dto.InstagramDtos.*;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/** Cálculo das métricas a partir das linhas do banco. Funções puras: sem I/O, fáceis de testar. */
public final class InstagramMetricas {

    private static final String[] DIAS = {"Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"};

    private InstagramMetricas() {
    }

    public static Resumo calcular(String username, List<PerfilDia> perfis, List<PostIg> posts, int dias,
                                  LocalDate hoje, ZoneId zona) {
        // uma linha por dia (a última lida vence), em ordem cronológica
        TreeMap<LocalDate, PerfilDia> porData = new TreeMap<>();
        for (PerfilDia p : perfis) {
            if (p.data() != null && p.seguidores() != null) {
                porData.put(p.data(), p);
            }
        }
        PerfilDia ultimo = porData.isEmpty() ? null : porData.lastEntry().getValue();

        Instant corte = hoje.minusDays(dias).atStartOfDay(zona).toInstant();
        List<PostIg> doPeriodo = posts.stream().filter(p -> !p.publicadoEm().isBefore(corte)).toList();

        long seguidoresRef = ultimo == null ? 0 : ultimo.seguidores();
        Long var7 = ultimo == null ? null : variacao(porData, ultimo, 7);
        Long var30 = ultimo == null ? null : variacao(porData, ultimo, 30);
        Double cresc30 = (var30 != null && seguidoresRef - var30 > 0) ? var30 * 100.0 / (seguidoresRef - var30) : null;

        List<PontoSerie> serie = new ArrayList<>();
        if (ultimo != null) {
            LocalDate ini = ultimo.data().minusDays(dias);
            porData.tailMap(ini, true).values().forEach(p -> serie.add(new PontoSerie(p.data(), p.seguidores())));
        }

        double mediaCurtidas = doPeriodo.stream().mapToLong(p -> n(p.curtidas())).average().orElse(0);
        double mediaComentarios = doPeriodo.stream().mapToLong(p -> n(p.comentarios())).average().orElse(0);
        double engajamento = seguidoresRef > 0
                ? doPeriodo.stream().mapToDouble(p -> p.interacoes() * 100.0 / seguidoresRef).average().orElse(0) : 0;

        List<PostIg> baseTop = doPeriodo.isEmpty() ? posts : doPeriodo;
        List<PostRes> top = baseTop.stream()
                .sorted(Comparator.comparingLong(PostIg::interacoes).reversed())
                .limit(5).map(p -> post(p, seguidoresRef)).toList();

        Instant atualizado = posts.stream().map(PostIg::atualizadoEm).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);

        return new Resumo(username, ultimo != null || !posts.isEmpty(), ultimo == null ? null : ultimo.data(),
                ultimo == null ? null : ultimo.seguidores(), ultimo == null ? null : ultimo.publicacoes(),
                var7, var30, cresc30, dias, doPeriodo.size(), mediaCurtidas, mediaComentarios, engajamento,
                serie, top, porTipo(doPeriodo), porDiaSemana(posts, zona), melhorHorario(posts, zona), atualizado);
    }

    /** Variação de seguidores nos últimos {@code dias}; null se não há uma foto de referência tão antiga. */
    static Long variacao(TreeMap<LocalDate, PerfilDia> porData, PerfilDia ultimo, int dias) {
        Map.Entry<LocalDate, PerfilDia> base = porData.floorEntry(ultimo.data().minusDays(dias));
        return base == null ? null : ultimo.seguidores() - base.getValue().seguidores();
    }

    static List<TipoStat> porTipo(List<PostIg> posts) {
        Map<String, List<PostIg>> g = posts.stream().collect(Collectors.groupingBy(
                p -> p.tipo() == null ? "OUTRO" : p.tipo(), LinkedHashMap::new, Collectors.toList()));
        return g.entrySet().stream()
                .map(e -> new TipoStat(e.getKey(), e.getValue().size(),
                        e.getValue().stream().mapToLong(PostIg::interacoes).average().orElse(0)))
                .sorted(Comparator.comparingInt(TipoStat::posts).reversed()).toList();
    }

    static List<DiaStat> porDiaSemana(List<PostIg> posts, ZoneId zona) {
        List<DiaStat> out = new ArrayList<>();
        for (DayOfWeek d : DayOfWeek.values()) { // segunda..domingo
            List<PostIg> doDia = posts.stream()
                    .filter(p -> p.publicadoEm().atZone(zona).getDayOfWeek() == d).toList();
            out.add(new DiaStat(DIAS[d.getValue() - 1], doDia.size(),
                    doDia.stream().mapToLong(PostIg::interacoes).average().orElse(0)));
        }
        return out;
    }

    /** Hora do dia (no fuso) com maior média de interações, exigindo ao menos 2 posts na hora. */
    static Integer melhorHorario(List<PostIg> posts, ZoneId zona) {
        Map<Integer, List<PostIg>> g = posts.stream().collect(Collectors.groupingBy(p -> p.publicadoEm().atZone(zona).getHour()));
        return g.entrySet().stream().filter(e -> e.getValue().size() >= 2)
                .max(Comparator.comparingDouble(e -> e.getValue().stream().mapToLong(PostIg::interacoes).average().orElse(0)))
                .map(Map.Entry::getKey).orElse(null);
    }

    public static PostRes post(PostIg p, long seguidores) {
        String legenda = p.legenda() == null ? "" : p.legenda().trim();
        if (legenda.length() > 220) {
            legenda = legenda.substring(0, 220).trim() + "…";
        }
        return new PostRes(p.id(), p.url(), legenda, p.tipo(), n(p.curtidas()), n(p.comentarios()),
                n(p.compartilhamentos()), p.interacoes(), seguidores > 0 ? p.interacoes() * 100.0 / seguidores : 0,
                p.publicadoEm());
    }

    /** Posts cuja legenda cita @handle (sem confundir @marca com @marcas ou @marca.oficial). */
    public static List<PostIg> mencoes(String handle, List<PostIg> posts) {
        if (handle == null || handle.isBlank()) {
            return List.of();
        }
        Pattern re = Pattern.compile("(?<![\\w.])@" + Pattern.quote(handle) + "(?![\\w.])", Pattern.CASE_INSENSITIVE);
        return posts.stream().filter(p -> p.legenda() != null && re.matcher(p.legenda()).find()).toList();
    }

    private static long n(Long v) {
        return v == null ? 0 : v;
    }
}
