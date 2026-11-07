package br.com.rbs.portal.domain;

/**
 * Entregas do patrocinador que têm prazo. Cada tipo está ligado a uma aba (a cota decide se existe)
 * e tem um prazo padrão, em dias ANTES da data do evento (ajustável por patrocinador no calendário).
 * Os prazos padrão são premissas do MVP: o TAP não os define. Valide com a RBS.
 */
public enum TipoEntrega {
    COMPRA_INGRESSOS("Enviar documento de compra de ingressos", Aba.PERFIL, 90),
    SIGNATARIO("Informar os dados do signatário do contrato", Aba.CONTRATO, 100),
    LOGO("Enviar a logo da marca", Aba.APLICACOES, 75),
    MIV("Enviar o MIV", Aba.APLICACOES, 75),
    MATERIAL_MIDIA("Enviar os materiais de mídia e conteúdo", Aba.MIDIA, 45),
    PERGUNTAS_PESQUISA("Definir as 3 perguntas da pesquisa de ativação", Aba.PESQUISA, 60),
    DESTINAR_CORTESIAS("Destinar as cortesias recebidas", Aba.CORTESIAS, 30),
    PERSONALIZADO("Prazo personalizado", null, 0);

    private final String titulo;
    private final Aba aba;
    private final int diasAntesDoEvento;

    TipoEntrega(String titulo, Aba aba, int diasAntesDoEvento) {
        this.titulo = titulo;
        this.aba = aba;
        this.diasAntesDoEvento = diasAntesDoEvento;
    }

    public String getTitulo() {
        return titulo;
    }

    /** Pode ser nulo (PERSONALIZADO). */
    public Aba getAba() {
        return aba;
    }

    public int getDiasAntesDoEvento() {
        return diasAntesDoEvento;
    }

    /** Prazos automáticos têm o status calculado a partir dos dados; os personalizados são marcados à mão. */
    public boolean isAutomatico() {
        return this != PERSONALIZADO;
    }
}
