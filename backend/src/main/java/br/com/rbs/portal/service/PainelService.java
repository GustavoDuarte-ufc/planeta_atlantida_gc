package br.com.rbs.portal.service;

import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.dto.PainelDtos.*;
import br.com.rbs.portal.dto.PrazoDtos.PrazoRes;
import br.com.rbs.portal.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/** Agregações do dashboard. Uma passada pelas marcas do evento; o volume do portal é pequeno (dezenas de marcas). */
@Service
@RequiredArgsConstructor
public class PainelService {

    private final PatrocinadorRepository patrocinadores;
    private final EventoRepository eventos;
    private final RelatorioService relatorio;
    private final PrazoService prazos;
    private final ArquivoRepository arquivos;
    private final CortesiaRepository cortesias;
    private final CredenciamentoRepository credenciamentos;
    private final HistoricoRepository historico;
    private final MensagemRepository mensagens;
    private final EventoService eventoService;

    /** Início da semana (segunda-feira) que contém a data. Regra pura. */
    static LocalDate segunda(LocalDate d) {
        return d.minusDays(d.getDayOfWeek().getValue() - 1L);
    }

    /** Prazos abertos por semana: "Atrasados" + as próximas {@code n} semanas. Regra pura. */
    static List<Semana> semanas(List<PrazoRes> abertos, LocalDate hoje, int n) {
        List<Semana> out = new ArrayList<>();
        out.add(new Semana("Atrasados", null, (int) abertos.stream().filter(p -> p.dataLimite().isBefore(hoje)).count()));
        LocalDate ini = segunda(hoje);
        for (int i = 0; i < n; i++) {
            LocalDate a = ini.plusWeeks(i), b = a.plusWeeks(1);
            int c = (int) abertos.stream()
                    .filter(p -> !p.dataLimite().isBefore(hoje) && !p.dataLimite().isBefore(a) && p.dataLimite().isBefore(b)).count();
            out.add(new Semana(i == 0 ? "Esta semana" : "+" + i + " sem.", a, c));
        }
        return out;
    }

    /** Resumo de prazos. Regra pura. */
    static PrazosResumo resumoPrazos(List<PrazoRes> lista) {
        return new PrazosResumo(lista.size(),
                (int) lista.stream().filter(PrazoRes::entregue).count(),
                (int) lista.stream().filter(p -> p.status() == StatusPrazo.NO_PRAZO).count(),
                (int) lista.stream().filter(p -> p.status() == StatusPrazo.URGENTE).count(),
                (int) lista.stream().filter(p -> p.status() == StatusPrazo.ATRASADO).count());
    }

    /** Dashboard de uma única marca (o chamador já validou o acesso). */
    @Transactional(readOnly = true)
    public PainelMarca marca(Patrocinador p, LocalDate hoje) {
        Long id = p.getId();
        List<PrazoRes> todos = prazos.dosPatrocinador(id, hoje);
        List<PrazoRes> proximos = todos.stream().filter(x -> !x.entregue())
                .sorted(Comparator.comparing(PrazoRes::dataLimite)).limit(5).toList();

        List<AbaStatus> abas = p.getCota().getAbas().stream().sorted()
                .map(a -> new AbaStatus(a, a.getLabel(), relatorio.concluida(p, a))).toList();

        List<Cortesia> cort = cortesias.findByPatrocinadorIdOrderBySetorAscTipoAsc(id);
        int cred = credenciamentos.findByPatrocinadorIdOrderBySetorAsc(id).stream().mapToInt(Credenciamento::getQuantidade).sum();
        List<AtividadeMarca> atividade = historico.findTop200ByPatrocinadorIdOrderByCriadoEmDesc(id).stream().limit(8)
                .map(h -> new AtividadeMarca(h.getAcao(), h.getDetalhe(), h.getCriadoEm())).toList();

        LocalDate inicio = eventoService.dataDe(p);
        return new PainelMarca(p.getNome(), eventoService.nomeDe(p), inicio, ChronoUnit.DAYS.between(hoje, inicio),
                relatorio.progresso(p), (int) abas.stream().filter(AbaStatus::concluida).count(), abas.size(),
                resumoPrazos(todos), proximos, abas,
                cort.stream().mapToInt(Cortesia::getQuantidade).sum(), cort.stream().mapToInt(Cortesia::getDestinada).sum(),
                cred, arquivos.countByPatrocinadorId(id),
                mensagens.countByPatrocinadorIdAndAutorRoleAndLidaFalse(id, Role.ADMIN_RBS), atividade);
    }

    @Transactional(readOnly = true)
    public Painel gerar(Long eventoId, LocalDate hoje) {
        List<Patrocinador> marcas = eventoId == null
                ? patrocinadores.findAll(Sort.by("nome")) : patrocinadores.findByEventoId(eventoId, Sort.by("nome"));
        Set<Long> ids = marcas.stream().map(Patrocinador::getId).collect(Collectors.toSet());
        String nomeEvento = eventoId == null ? "Todos os eventos"
                : eventos.findById(eventoId).map(Evento::getNome).orElse("Evento");

        List<PrazoRes> todos = prazos.todos(hoje).stream().filter(p -> ids.contains(p.patrocinadorId())).toList();
        List<PrazoRes> abertos = todos.stream().filter(p -> !p.entregue()).toList();

        Map<Long, Integer> progresso = new HashMap<>();
        int[] porAbaConcl = new int[Aba.values().length];
        int[] porAbaApl = new int[Aba.values().length];
        int cortTotal = 0, cortDest = 0, cred = 0;
        long arqs = 0;
        for (Patrocinador p : marcas) {
            progresso.put(p.getId(), relatorio.progresso(p));
            for (Aba a : p.getCota().getAbas()) {
                porAbaApl[a.ordinal()]++;
                if (relatorio.concluida(p, a)) {
                    porAbaConcl[a.ordinal()]++;
                }
            }
            for (Cortesia c : cortesias.findByPatrocinadorIdOrderBySetorAscTipoAsc(p.getId())) {
                cortTotal += c.getQuantidade();
                cortDest += c.getDestinada();
            }
            cred += credenciamentos.findByPatrocinadorIdOrderBySetorAsc(p.getId()).stream().mapToInt(Credenciamento::getQuantidade).sum();
            arqs += arquivos.countByPatrocinadorId(p.getId());
        }
        int media = marcas.isEmpty() ? 0 : (int) Math.round(progresso.values().stream().mapToInt(Integer::intValue).average().orElse(0));
        long completas = progresso.values().stream().filter(v -> v == 100).count();
        long naoLidas = mensagens.countByAutorRoleAndLidaFalse(Role.ADMIN_PATROCINADOR);

        Totais totais = new Totais(marcas.size(), media, (int) completas, arqs, cortTotal, cortDest, cred, naoLidas);

        PrazosResumo pr = resumoPrazos(todos);

        List<PorCota> porCota = new ArrayList<>();
        for (Cota c : Cota.values()) {
            List<Patrocinador> doNivel = marcas.stream().filter(p -> p.getCota() == c).toList();
            int m = doNivel.isEmpty() ? 0 : (int) Math.round(doNivel.stream().mapToInt(p -> progresso.get(p.getId())).average().orElse(0));
            porCota.add(new PorCota(c, c.getLabel(), doNivel.size(), m));
        }

        List<PorAba> porAba = new ArrayList<>();
        for (Aba a : Aba.values()) {
            if (porAbaApl[a.ordinal()] > 0) {
                porAba.add(new PorAba(a, a.getLabel(), porAbaApl[a.ordinal()], porAbaConcl[a.ordinal()]));
            }
        }

        List<MarcaLinha> linhas = marcas.stream().map(p -> {
            List<PrazoRes> meus = abertos.stream().filter(x -> x.patrocinadorId().equals(p.getId())).toList();
            return new MarcaLinha(p.getId(), p.getNome(), p.getCota(), p.getCota().getLabel(), progresso.get(p.getId()),
                    (int) meus.stream().filter(x -> x.status() == StatusPrazo.ATRASADO).count(),
                    (int) meus.stream().filter(x -> x.status() == StatusPrazo.URGENTE).count(), meus.size());
        }).sorted(Comparator.comparingInt(MarcaLinha::atrasados).reversed()
                .thenComparing(Comparator.comparingInt(MarcaLinha::urgentes).reversed())
                .thenComparingInt(MarcaLinha::progresso)).toList();

        List<Atividade> atividade = historico.findTop100ByOrderByCriadoEmDesc().stream()
                .filter(h -> ids.contains(h.getPatrocinador().getId())).limit(10)
                .map(h -> new Atividade(h.getPatrocinador().getNome(), h.getUsuario(), h.getAcao(), h.getDetalhe(), h.getCriadoEm()))
                .toList();

        return new Painel(eventoId, nomeEvento, totais, pr, porCota, porAba, semanas(abertos, hoje, 8), linhas, atividade);
    }
}
