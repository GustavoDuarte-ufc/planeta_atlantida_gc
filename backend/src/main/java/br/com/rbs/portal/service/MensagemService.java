package br.com.rbs.portal.service;

import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.dto.MensagemDtos.ConversaRes;
import br.com.rbs.portal.dto.MensagemDtos.MensagemRes;
import br.com.rbs.portal.repository.MensagemRepository;
import br.com.rbs.portal.repository.PatrocinadorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Conversa entre cada marca e a RBS. A marca só enxerga a própria conversa (garantido por AcessoService). */
@Service
@RequiredArgsConstructor
public class MensagemService {

    private final MensagemRepository mensagens;
    private final PatrocinadorRepository patrocinadores;
    private final AlertaService alertas;

    /** Lado oposto ao leitor: o que o outro escreveu e o leitor ainda não viu. */
    static Role ladoOposto(Role leitor) {
        return leitor == Role.ADMIN_RBS ? Role.ADMIN_PATROCINADOR : Role.ADMIN_RBS;
    }

    /** Lista a conversa e marca como lidas as mensagens do outro lado. */
    @Transactional
    public List<MensagemRes> abrir(Patrocinador p, Usuario leitor) {
        Role outro = ladoOposto(leitor.getRole());
        mensagens.findByPatrocinadorIdAndAutorRoleAndLidaFalse(p.getId(), outro).forEach(m -> m.setLida(true));
        return mensagens.findByPatrocinadorIdOrderByCriadoEmAsc(p.getId()).stream()
                .map(m -> new MensagemRes(m.getId(), m.getAutorNome(), m.getAutorRole(), m.getAssunto(), m.getTexto(),
                        m.getCriadoEm(), m.getAutorRole() == leitor.getRole())).toList();
    }

    @Transactional
    public void enviar(Patrocinador p, Usuario autor, String assunto, String texto) {
        Mensagem m = new Mensagem();
        m.setPatrocinador(p);
        m.setAutorNome(autor.getNome());
        m.setAutorRole(autor.getRole());
        m.setAssunto(assunto == null || assunto.isBlank() ? null : assunto.trim());
        m.setTexto(texto.trim());
        mensagens.save(m);

        String trecho = resumo(m.getTexto());
        if (autor.getRole() == Role.ADMIN_RBS) {
            alertas.notificarComEmail(p, TipoAlerta.MENSAGEM, "Nova mensagem da equipe RBS", trecho);
        } else {
            alertas.notificar(p, Role.ADMIN_RBS, TipoAlerta.MENSAGEM, p.getNome() + " enviou uma mensagem", trecho);
        }
    }

    public long naoLidas(Usuario u) {
        if (u.getRole() == Role.ADMIN_RBS) {
            return mensagens.countByAutorRoleAndLidaFalse(Role.ADMIN_PATROCINADOR);
        }
        return u.getPatrocinador() == null ? 0
                : mensagens.countByPatrocinadorIdAndAutorRoleAndLidaFalse(u.getPatrocinador().getId(), Role.ADMIN_RBS);
    }

    /** Caixa de entrada da RBS: conversas com não lidas primeiro, depois as mais recentes. */
    public List<ConversaRes> caixa() {
        List<ConversaRes> out = new ArrayList<>();
        for (Patrocinador p : patrocinadores.findAll(Sort.by("nome"))) {
            List<Mensagem> conv = mensagens.findByPatrocinadorIdOrderByCriadoEmAsc(p.getId());
            if (conv.isEmpty()) {
                continue;
            }
            Mensagem ult = conv.get(conv.size() - 1);
            long nao = conv.stream().filter(m -> m.getAutorRole() == Role.ADMIN_PATROCINADOR && !m.isLida()).count();
            out.add(new ConversaRes(p.getId(), p.getNome(), p.getEvento() == null ? null : p.getEvento().getNome(),
                    resumo(ult.getTexto()), ult.getCriadoEm(), ult.getAutorRole() == Role.ADMIN_RBS, nao));
        }
        out.sort(Comparator.comparing((ConversaRes c) -> c.naoLidas() > 0 ? 0 : 1)
                .thenComparing(ConversaRes::ultimaEm, Comparator.reverseOrder()));
        return out;
    }

    static String resumo(String t) {
        String s = t.replaceAll("\\s+", " ").trim();
        return s.length() > 140 ? s.substring(0, 140).trim() + "…" : s;
    }
}
