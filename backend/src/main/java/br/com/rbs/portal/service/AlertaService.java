package br.com.rbs.portal.service;

import br.com.rbs.portal.config.PortalProps;
import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.dto.PrazoDtos.AlertaRes;
import br.com.rbs.portal.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Alertas automáticos. O job diário chama {@link #verificarPrazos(LocalDate)}; uploads e publicações de
 * contrato chamam {@link #notificar}. Cada marco (7, 3, 1 dia, vencimento, cada semana de atraso) gera
 * um único alerta por prazo, graças à {@code chave} única.
 */
@Service
@RequiredArgsConstructor
public class AlertaService {

    private static final Logger log = LoggerFactory.getLogger(AlertaService.class);

    private final AlertaRepository alertas;
    private final AlertaLeituraRepository leituras;
    private final PrazoRepository prazos;
    private final PrazoService prazoService;
    private final UsuarioRepository usuarios;
    private final EmailService email;
    private final PortalProps props;

    /** Marco do alerta para quantos dias faltam; {@code null} se ainda não é hora de avisar. Regra pura. */
    public static String marco(long diasRestantes) {
        if (diasRestantes < 0) {
            return "ATRASO" + ((-diasRestantes - 1) / 7); // uma vez por semana de atraso
        }
        if (diasRestantes == 0) {
            return "D0";
        }
        if (diasRestantes <= 1) {
            return "D1";
        }
        if (diasRestantes <= 3) {
            return "D3";
        }
        if (diasRestantes <= 7) {
            return "D7";
        }
        return null;
    }

    /** Percorre os prazos abertos e cria os alertas devidos. Retorna quantos alertas novos saíram. */
    @Transactional
    public int verificarPrazos(LocalDate hoje) {
        int criados = 0;
        for (Prazo pz : prazos.findAllByOrderByDataLimiteAsc()) {
            long dias = ChronoUnit.DAYS.between(hoje, pz.getDataLimite());
            String marco = marco(dias);
            if (marco == null || prazoService.entregue(pz)) {
                continue;
            }
            String chave = "PRAZO:" + pz.getId() + ":" + pz.getDataLimite() + ":" + marco;
            if (alertas.existsByChave(chave)) {
                continue;
            }
            Patrocinador p = pz.getPatrocinador();
            boolean atrasado = dias < 0;
            String quando = atrasado ? "está atrasado há " + (-dias) + " dia(s)"
                    : dias == 0 ? "vence hoje" : "vence em " + dias + " dia(s)";
            String titulo = (atrasado ? "Prazo atrasado: " : "Prazo próximo: ") + pz.getTitulo();
            String msg = "\"" + pz.getTitulo() + "\" " + quando + " (limite " + fmt(pz.getDataLimite()) + ").";

            gravar(p, Role.ADMIN_PATROCINADOR, atrasado ? TipoAlerta.PRAZO_ATRASADO : TipoAlerta.PRAZO_PROXIMO,
                    titulo, msg, chave);
            if (atrasado) {
                gravar(p, Role.ADMIN_RBS, TipoAlerta.PRAZO_ATRASADO, p.getNome() + " — " + titulo, msg, chave + ":RBS");
            }
            email.enviar(emailsDoPatrocinador(p.getId()), titulo, titulo, msg + "\nAcesse o portal para enviar o que falta.",
                    "Abrir o portal", props.frontendUrl() + "/portal/" + p.getId());
            criados++;
        }
        log.info("Verificação de prazos: {} alerta(s) novo(s)", criados);
        return criados;
    }

    /** Alerta pontual (upload, contrato publicado...). Não envia e-mail; use {@link #notificarComEmail}. */
    @Transactional
    public void notificar(Patrocinador p, Role destino, TipoAlerta tipo, String titulo, String mensagem) {
        gravar(p, destino, tipo, titulo, mensagem, null);
    }

    /** Como {@link #notificar}, mas só uma vez por chave. Retorna false se já existia. */
    @Transactional
    public boolean notificarUnico(Patrocinador p, Role destino, TipoAlerta tipo, String titulo, String mensagem, String chave) {
        if (alertas.existsByChave(chave)) {
            return false;
        }
        gravar(p, destino, tipo, titulo, mensagem, chave);
        return true;
    }

    @Transactional
    public void notificarComEmail(Patrocinador p, TipoAlerta tipo, String titulo, String mensagem) {
        gravar(p, Role.ADMIN_PATROCINADOR, tipo, titulo, mensagem, null);
        email.enviar(emailsDoPatrocinador(p.getId()), titulo, titulo, mensagem, "Abrir o portal",
                props.frontendUrl() + "/portal/" + p.getId());
    }

    private void gravar(Patrocinador p, Role destino, TipoAlerta tipo, String titulo, String msg, String chave) {
        Alerta a = new Alerta();
        a.setPatrocinador(p);
        a.setDestino(destino);
        a.setTipo(tipo);
        a.setTitulo(titulo.length() > 250 ? titulo.substring(0, 250) : titulo);
        a.setMensagem(msg != null && msg.length() > 1000 ? msg.substring(0, 1000) : msg);
        a.setChave(chave);
        alertas.save(a);
    }

    private List<String> emailsDoPatrocinador(Long patrocinadorId) {
        return usuarios.findByPatrocinadorIdOrderByNome(patrocinadorId).stream()
                .filter(Usuario::isAtivo).map(Usuario::getEmail).toList();
    }

    // ---- Leitura (por usuário)

    @Transactional(readOnly = true)
    public List<AlertaRes> listar(Usuario u) {
        List<Alerta> lista = u.getRole() == Role.ADMIN_RBS
                ? alertas.findTop100ByDestinoOrderByCriadoEmDesc(Role.ADMIN_RBS)
                : u.getPatrocinador() == null ? List.of()
                : alertas.findTop100ByDestinoAndPatrocinadorIdOrderByCriadoEmDesc(Role.ADMIN_PATROCINADOR, u.getPatrocinador().getId());
        Set<Long> lidas = lista.isEmpty() ? Set.of()
                : leituras.findByUsuarioIdAndAlertaIdIn(u.getId(), lista.stream().map(Alerta::getId).toList())
                .stream().map(AlertaLeitura::getAlertaId).collect(Collectors.toSet());
        return lista.stream().map(a -> new AlertaRes(a.getId(), a.getTipo(), a.getTitulo(), a.getMensagem(),
                a.getPatrocinador().getId(), a.getPatrocinador().getNome(), a.getCriadoEm(), lidas.contains(a.getId()))).toList();
    }

    @Transactional
    public void marcarLida(Usuario u, Long alertaId) {
        Alerta a = alertas.findById(alertaId).orElse(null);
        if (a == null || !visivel(a, u) || leituras.existsByUsuarioIdAndAlertaId(u.getId(), alertaId)) {
            return;
        }
        AlertaLeitura l = new AlertaLeitura();
        l.setAlertaId(alertaId);
        l.setUsuarioId(u.getId());
        leituras.save(l);
    }

    @Transactional
    public void marcarTodasLidas(Usuario u) {
        listar(u).stream().filter(a -> !a.lida()).forEach(a -> marcarLida(u, a.id()));
    }

    private static boolean visivel(Alerta a, Usuario u) {
        if (u.getRole() == Role.ADMIN_RBS) {
            return a.getDestino() == Role.ADMIN_RBS;
        }
        return a.getDestino() == Role.ADMIN_PATROCINADOR && u.getPatrocinador() != null
                && u.getPatrocinador().getId().equals(a.getPatrocinador().getId());
    }

    private static String fmt(LocalDate d) {
        return String.format("%02d/%02d/%d", d.getDayOfMonth(), d.getMonthValue(), d.getYear());
    }
}
