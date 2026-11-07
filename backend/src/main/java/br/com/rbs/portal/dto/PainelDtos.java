package br.com.rbs.portal.dto;

import br.com.rbs.portal.domain.Aba;
import br.com.rbs.portal.domain.Cota;

import java.time.Instant;
import java.time.LocalDate;
import br.com.rbs.portal.dto.PrazoDtos.PrazoRes;

import java.util.List;

/** Números do dashboard da RBS, já agregados. */
public final class PainelDtos {

    private PainelDtos() {
    }

    public record Totais(int marcas, int progressoMedio, int marcasCompletas, long arquivos, int cortesiasTotal,
                         int cortesiasDestinadas, int credenciais, long mensagensNaoLidas) {
    }

    public record PrazosResumo(int total, int entregues, int noPrazo, int urgentes, int atrasados) {
    }

    public record PorCota(Cota cota, String label, int marcas, int progressoMedio) {
    }

    public record PorAba(Aba aba, String label, int aplicaveis, int concluidas) {
    }

    public record Semana(String rotulo, LocalDate inicio, int abertos) {
    }

    public record MarcaLinha(Long id, String nome, Cota cota, String cotaLabel, int progresso, int atrasados,
                             int urgentes, int abertos) {
    }

    public record Atividade(String marca, String usuario, String acao, String detalhe, Instant criadoEm) {
    }

    public record Painel(Long eventoId, String eventoNome, Totais totais, PrazosResumo prazos, List<PorCota> porCota,
                         List<PorAba> porAba, List<Semana> semanas, List<MarcaLinha> marcas, List<Atividade> atividade) {
    }

    public record AbaStatus(Aba aba, String label, boolean concluida) {
    }

    /** Atividade na visão da marca: sem e-mail de quem fez (não expõe a equipe RBS). */
    public record AtividadeMarca(String acao, String detalhe, Instant criadoEm) {
    }

    /** Dashboard de UMA marca: só dados dela. */
    public record PainelMarca(String marca, String eventoNome, LocalDate eventoInicio, long diasParaEvento,
                              int progresso, int abasConcluidas, int abasTotal, PrazosResumo prazos,
                              List<PrazoRes> proximos, List<AbaStatus> abas, int cortesiasTotal,
                              int cortesiasDestinadas, int credenciais, long arquivos, long mensagensNaoLidas,
                              List<AtividadeMarca> atividade) {
    }
}
