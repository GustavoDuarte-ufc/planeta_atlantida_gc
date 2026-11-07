package br.com.rbs.portal.service;

import br.com.rbs.portal.config.PortalProps;
import br.com.rbs.portal.domain.Evento;
import br.com.rbs.portal.domain.Patrocinador;
import br.com.rbs.portal.dto.EventoDtos.EventoRes;
import br.com.rbs.portal.repository.EventoRepository;
import br.com.rbs.portal.repository.PatrocinadorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventoService {

    private final EventoRepository eventos;
    private final PatrocinadorRepository patrocinadores;
    private final PortalProps props;

    /** Regra pura do status. */
    public static String status(LocalDate inicio, LocalDate fim, LocalDate hoje) {
        LocalDate f = fim != null ? fim : inicio;
        if (hoje.isBefore(inicio)) {
            return "PLANEJADO";
        }
        return hoje.isAfter(f) ? "ENCERRADO" : "EM_ANDAMENTO";
    }

    /** Evento padrão (criado a partir de EVENTO_NOME/EVENTO_DATA na primeira vez). */
    @Transactional
    public Evento padrao() {
        List<Evento> lista = eventos.findAllByOrderByInicioDesc();
        if (!lista.isEmpty()) {
            return lista.get(0);
        }
        Evento e = new Evento();
        e.setNome(props.eventoNome());
        e.setInicio(props.eventoData());
        return eventos.save(e);
    }

    /** Liga ao evento padrão as marcas antigas (de antes de existir cadastro de eventos). */
    @Transactional
    public int vincularLegado() {
        List<Patrocinador> sem = patrocinadores.findByEventoIsNull();
        if (sem.isEmpty()) {
            return 0;
        }
        Evento e = padrao();
        sem.forEach(p -> p.setEvento(e));
        return sem.size();
    }

    public LocalDate dataDe(Patrocinador p) {
        return p.getEvento() != null ? p.getEvento().getInicio() : props.eventoData();
    }

    public String nomeDe(Patrocinador p) {
        return p.getEvento() != null ? p.getEvento().getNome() : props.eventoNome();
    }

    public EventoRes res(Evento e, int marcas, int progressoMedio, LocalDate hoje) {
        return new EventoRes(e.getId(), e.getNome(), e.getInicio(), e.getFim(), e.getLocal(), e.getDescricao(),
                status(e.getInicio(), e.getFim(), hoje), ChronoUnit.DAYS.between(hoje, e.getInicio()), marcas, progressoMedio);
    }
}
