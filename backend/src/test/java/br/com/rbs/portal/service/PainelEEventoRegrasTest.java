package br.com.rbs.portal.service;

import br.com.rbs.portal.domain.Aba;
import br.com.rbs.portal.domain.StatusPrazo;
import br.com.rbs.portal.domain.TipoEntrega;
import br.com.rbs.portal.dto.PainelDtos.Semana;
import br.com.rbs.portal.dto.PrazoDtos.PrazoRes;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PainelEEventoRegrasTest {

    static final LocalDate HOJE = LocalDate.of(2026, 11, 4); // quarta-feira

    static PrazoRes prazo(LocalDate limite) {
        return new PrazoRes(1L, 1L, "m", TipoEntrega.LOGO, "t", null, limite, Aba.APLICACOES, "x",
                StatusPrazo.NO_PRAZO, false, 0, true);
    }

    @Test
    void statusDoEvento() {
        LocalDate ini = LocalDate.of(2027, 1, 29), fim = LocalDate.of(2027, 1, 30);
        assertEquals("PLANEJADO", EventoService.status(ini, fim, ini.minusDays(1)));
        assertEquals("EM_ANDAMENTO", EventoService.status(ini, fim, ini));
        assertEquals("EM_ANDAMENTO", EventoService.status(ini, fim, fim));
        assertEquals("ENCERRADO", EventoService.status(ini, fim, fim.plusDays(1)));
        assertEquals("EM_ANDAMENTO", EventoService.status(ini, null, ini)); // evento de um dia
        assertEquals("ENCERRADO", EventoService.status(ini, null, ini.plusDays(1)));
    }

    @Test
    void segundaDaSemana() {
        assertEquals(LocalDate.of(2026, 11, 2), PainelService.segunda(HOJE));
        assertEquals(LocalDate.of(2026, 11, 2), PainelService.segunda(LocalDate.of(2026, 11, 2)));
        assertEquals(LocalDate.of(2026, 11, 2), PainelService.segunda(LocalDate.of(2026, 11, 8))); // domingo
    }

    @Test
    void semanasSeparamAtrasadosDeFuturos() {
        List<PrazoRes> abertos = List.of(
                prazo(HOJE.minusDays(1)),   // atrasado (mesmo estando na semana corrente)
                prazo(HOJE),                // esta semana
                prazo(HOJE.plusDays(4)),    // domingo desta semana
                prazo(HOJE.plusDays(5)),    // +1 sem.
                prazo(HOJE.plusDays(200))); // fora do horizonte
        List<Semana> s = PainelService.semanas(abertos, HOJE, 8);
        assertEquals(9, s.size());
        assertEquals(1, s.get(0).abertos());
        assertEquals(2, s.get(1).abertos());
        assertEquals(1, s.get(2).abertos());
    }

    @Test
    void resumoDeMensagemEncurtaEJuntaEspacos() {
        assertEquals("a b c", MensagemService.resumo("a   b\n c "));
        assertEquals(141, MensagemService.resumo("x".repeat(500)).length());
    }
}
