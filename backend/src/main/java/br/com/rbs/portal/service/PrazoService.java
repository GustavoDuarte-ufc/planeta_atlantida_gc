package br.com.rbs.portal.service;

import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.dto.PrazoDtos.PrazoRes;
import br.com.rbs.portal.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Prazos de entrega. O status é CALCULADO a partir do que existe no portal (arquivo enviado, perguntas
 * preenchidas, signatário informado...): quando o cliente entrega, o prazo vira "entregue" sozinho.
 * Esta classe não depende do usuário logado, então também serve ao job agendado.
 */
@Service
@RequiredArgsConstructor
public class PrazoService {

    /** Faltando até este número de dias, o prazo fica "urgente". */
    public static final int DIAS_URGENTE = 7;

    private final PrazoRepository prazos;
    private final ArquivoRepository arquivos;
    private final ItemConteudoRepository itens;
    private final CortesiaRepository cortesias;
    private final PerguntaPesquisaRepository perguntas;
    private final EventoService eventos;

    /** Regra pura do status (testável sem banco). */
    public static StatusPrazo calcularStatus(LocalDate limite, boolean entregue, LocalDate hoje) {
        if (entregue) {
            return StatusPrazo.ENTREGUE;
        }
        long dias = ChronoUnit.DAYS.between(hoje, limite);
        if (dias < 0) {
            return StatusPrazo.ATRASADO;
        }
        return dias <= DIAS_URGENTE ? StatusPrazo.URGENTE : StatusPrazo.NO_PRAZO;
    }

    /** Cria os prazos padrão da cota que ainda não existem. Idempotente. Retorna quantos criou. */
    @Transactional
    public int gerarPadrao(Patrocinador p) {
        LocalDate evento = eventos.dataDe(p);
        int criados = 0;
        for (TipoEntrega t : TipoEntrega.values()) {
            if (!t.isAutomatico() || !p.getCota().permite(t.getAba())) {
                continue;
            }
            if (prazos.existsByPatrocinadorIdAndTipo(p.getId(), t)) {
                continue;
            }
            Prazo prazo = new Prazo();
            prazo.setPatrocinador(p);
            prazo.setTipo(t);
            prazo.setTitulo(t.getTitulo());
            prazo.setDataLimite(evento.minusDays(t.getDiasAntesDoEvento()));
            prazos.save(prazo);
            criados++;
        }
        return criados;
    }

    /** Recalcula as datas dos prazos padrão ainda abertos (após mudar a data ou o evento da marca). */
    @Transactional
    public void reagendar(Patrocinador p) {
        LocalDate evento = eventos.dataDe(p);
        for (Prazo pz : prazos.findByPatrocinadorIdOrderByDataLimiteAsc(p.getId())) {
            if (pz.getTipo().isAutomatico() && !entregue(pz)) {
                pz.setDataLimite(evento.minusDays(pz.getTipo().getDiasAntesDoEvento()));
            }
        }
    }

    public boolean entregue(Prazo pz) {
        Long id = pz.getPatrocinador().getId();
        return switch (pz.getTipo()) {
            case COMPRA_INGRESSOS -> arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.COMPRA_INGRESSOS) > 0;
            case SIGNATARIO -> itens.countByPatrocinadorIdAndTipo(id, TipoItem.SIGNATARIO) > 0;
            case LOGO -> arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.LOGO) > 0;
            case MIV -> arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.MIV) > 0;
            case MATERIAL_MIDIA -> arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.MATERIAL_MIDIA) > 0
                    || itens.countByPatrocinadorIdAndTipo(id, TipoItem.TEXTO_MIDIA) > 0;
            case PERGUNTAS_PESQUISA -> perguntas.findByPatrocinadorIdOrderByOrdem(id).stream()
                    .filter(q -> q.getPergunta() != null && !q.getPergunta().isBlank()).count() >= 3;
            case DESTINAR_CORTESIAS -> {
                List<Cortesia> lista = cortesias.findByPatrocinadorIdOrderBySetorAscTipoAsc(id);
                int total = lista.stream().mapToInt(Cortesia::getQuantidade).sum();
                int dest = lista.stream().mapToInt(Cortesia::getDestinada).sum();
                yield total > 0 && dest >= total;
            }
            case PERSONALIZADO -> pz.isConcluidoManual();
        };
    }

    public PrazoRes res(Prazo pz, LocalDate hoje) {
        boolean ok = entregue(pz);
        Aba aba = pz.getTipo().getAba();
        return new PrazoRes(pz.getId(), pz.getPatrocinador().getId(), pz.getPatrocinador().getNome(), pz.getTipo(),
                pz.getTitulo(), pz.getDescricao(), pz.getDataLimite(), aba, aba == null ? null : aba.getLabel(),
                calcularStatus(pz.getDataLimite(), ok, hoje), ok,
                ChronoUnit.DAYS.between(hoje, pz.getDataLimite()), pz.getTipo().isAutomatico());
    }

    public List<PrazoRes> todos(LocalDate hoje) {
        return prazos.findAllByOrderByDataLimiteAsc().stream().map(x -> res(x, hoje)).toList();
    }

    public List<PrazoRes> dosPatrocinador(Long patrocinadorId, LocalDate hoje) {
        return prazos.findByPatrocinadorIdOrderByDataLimiteAsc(patrocinadorId).stream()
                .map(x -> res(x, hoje)).toList();
    }

    /** Prazos ainda abertos de um patrocinador (para relatório e painel). */
    public List<PrazoRes> abertos(Long patrocinadorId, LocalDate hoje) {
        List<PrazoRes> out = new ArrayList<>(dosPatrocinador(patrocinadorId, hoje));
        out.removeIf(PrazoRes::entregue);
        return out;
    }

    /** Gera o calendário (.ics) com os prazos informados, para importar no Outlook/Google. */
    public static String ics(List<PrazoRes> lista) {
        StringBuilder sb = new StringBuilder();
        sb.append("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Portal do Patrocinador//PT-BR\r\nCALSCALE:GREGORIAN\r\n");
        sb.append("X-WR-CALNAME:Prazos do Portal do Patrocinador\r\n");
        for (PrazoRes r : lista) {
            String dia = r.dataLimite().toString().replace("-", "");
            sb.append("BEGIN:VEVENT\r\n");
            sb.append("UID:prazo-").append(r.id()).append("@portal-patrocinador\r\n");
            sb.append("DTSTAMP:").append(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'")
                    .withZone(java.time.ZoneOffset.UTC).format(java.time.Instant.now())).append("\r\n");
            sb.append("DTSTART;VALUE=DATE:").append(dia).append("\r\n");
            sb.append("DTEND;VALUE=DATE:").append(r.dataLimite().plusDays(1).toString().replace("-", "")).append("\r\n");
            sb.append("SUMMARY:").append(icsTexto(r.patrocinador() + " — " + r.titulo())).append("\r\n");
            sb.append("DESCRIPTION:").append(icsTexto("Status: " + r.status()
                    + (r.descricao() == null ? "" : "\n" + r.descricao()))).append("\r\n");
            sb.append("BEGIN:VALARM\r\nTRIGGER:-P3D\r\nACTION:DISPLAY\r\nDESCRIPTION:Prazo em 3 dias\r\nEND:VALARM\r\n");
            sb.append("END:VEVENT\r\n");
        }
        sb.append("END:VCALENDAR\r\n");
        return sb.toString();
    }

    static String icsTexto(String s) {
        return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
                .replace("\r", "").replace("\n", "\\n");
    }
}
