package br.com.rbs.portal.service;

import br.com.rbs.portal.domain.StatusPrazo;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Regras de negócio puras (sem Spring nem banco): rápidas e determinísticas. */
class RegrasPurasTest {

    // ---- Status de prazo
    private static final LocalDate HOJE = LocalDate.of(2026, 11, 2);

    @Test
    void entregueSempreVenceOAtraso() {
        assertThat(PrazoService.calcularStatus(HOJE.minusDays(30), true, HOJE)).isEqualTo(StatusPrazo.ENTREGUE);
    }

    @Test
    void statusPelaDistanciaDoPrazo() {
        assertThat(PrazoService.calcularStatus(HOJE.minusDays(1), false, HOJE)).isEqualTo(StatusPrazo.ATRASADO);
        assertThat(PrazoService.calcularStatus(HOJE, false, HOJE)).isEqualTo(StatusPrazo.URGENTE);
        assertThat(PrazoService.calcularStatus(HOJE.plusDays(7), false, HOJE)).isEqualTo(StatusPrazo.URGENTE);
        assertThat(PrazoService.calcularStatus(HOJE.plusDays(8), false, HOJE)).isEqualTo(StatusPrazo.NO_PRAZO);
    }

    // ---- Marcos de alerta
    @Test
    void marcosDeAlerta() {
        assertThat(AlertaService.marco(30)).isNull();
        assertThat(AlertaService.marco(8)).isNull();
        assertThat(AlertaService.marco(7)).isEqualTo("D7");
        assertThat(AlertaService.marco(4)).isEqualTo("D7");
        assertThat(AlertaService.marco(3)).isEqualTo("D3");
        assertThat(AlertaService.marco(2)).isEqualTo("D3");
        assertThat(AlertaService.marco(1)).isEqualTo("D1");
        assertThat(AlertaService.marco(0)).isEqualTo("D0");
        assertThat(AlertaService.marco(-1)).isEqualTo("ATRASO0");
        assertThat(AlertaService.marco(-7)).isEqualTo("ATRASO0");
        assertThat(AlertaService.marco(-8)).isEqualTo("ATRASO1");
    }

    // ---- Modelo de contrato
    @Test
    void renderizaVariaveisEMarcaPendentes() {
        var r = ModeloRenderer.renderizar("Contrato de {{ patrocinador.nome }} - {{signatario.cargo}} - {{x}}",
                Map.of("patrocinador.nome", "Marca S.A.", "x", "  "));
        assertThat(r.texto()).isEqualTo("Contrato de Marca S.A. - {{signatario.cargo}} - {{x}}");
        assertThat(r.pendentes()).containsExactly("signatario.cargo", "x");
    }

    @Test
    void valorComCifraoOuBarraNaoQuebra() {
        var r = ModeloRenderer.renderizar("Valor: {{v}}", Map.of("v", "R$ 1.000,00 \\ $1"));
        assertThat(r.texto()).isEqualTo("Valor: R$ 1.000,00 \\ $1");
    }

    @Test
    void valorInseridoNaoVirouNovaVariavel() {
        var r = ModeloRenderer.renderizar("{{a}}", Map.of("a", "{{b}}", "b", "SEGREDO"));
        assertThat(r.texto()).isEqualTo("{{b}}");
    }

    @Test
    void listaVariaveisSemRepetir() {
        assertThat(ModeloRenderer.variaveis("{{a}} {{b.c}} {{a}}")).containsExactly("a", "b.c");
    }

    @Test
    void leSignatarioDoCadastro() {
        var v = ContratoService.parseSignatario("Maria Silva",
                "E-mail: maria@x.com\nCargo: Diretora\nDocumento: 123.456.789-00");
        assertThat(v).containsEntry("signatario.nome", "Maria Silva")
                .containsEntry("signatario.email", "maria@x.com")
                .containsEntry("signatario.cargo", "Diretora")
                .containsEntry("signatario.documento", "123.456.789-00");
        // formato antigo/livre: só o que dá para entender
        assertThat(ContratoService.parseSignatario("João", "texto solto sem dois pontos"))
                .containsOnlyKeys("signatario.nome");
    }

    @Test
    void dataPorExtenso() {
        assertThat(ContratoService.extenso(LocalDate.of(2026, 11, 2))).isEqualTo("2 de novembro de 2026");
        assertThat(ContratoService.dataBr(LocalDate.of(2027, 1, 9))).isEqualTo("09/01/2027");
    }

    // ---- Busca do FAQ
    @Test
    void buscaIgnoraAcentoEAchaPorRadical() {
        var corpus = List.of(
                new BuscaTextual.Trecho("FAQ: Como destino as cortesias?", "Na aba Cortesias informe as quantidades."),
                new BuscaTextual.Trecho("FAQ: Esqueci minha senha", "Use o link Esqueci minha senha na entrada."));
        var r = BuscaTextual.buscar("onde destinar cortesia?", corpus, 3);
        assertThat(r).isNotEmpty();
        assertThat(r.get(0).trecho().titulo()).contains("cortesias");
        assertThat(BuscaTextual.buscar("futebol americano", corpus, 3)).isEmpty();
    }

    // ---- Limitador
    @Test
    void limitadorBloqueiaAposOMaximoELibera() {
        var rl = new RateLimiter(3, Duration.ofMinutes(1));
        rl.registrar("a");
        rl.registrar("a");
        assertThat(rl.excedido("a")).isFalse();
        rl.registrar("a");
        assertThat(rl.excedido("a")).isTrue();
        assertThat(rl.excedido("b")).isFalse();
        rl.limpar("a");
        assertThat(rl.excedido("a")).isFalse();
    }

    // ---- ICS
    @Test
    void textoDoIcsEscapaCaracteresEspeciais() {
        assertThat(PrazoService.icsTexto("a;b,c\nd")).isEqualTo("a\\;b\\,c\\nd");
    }
}
