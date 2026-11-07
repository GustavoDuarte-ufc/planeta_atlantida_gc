package br.com.rbs.portal.domain;

/** As 7 abas do portal (sugestão da empresa). */
public enum Aba {
    PERFIL("Perfil do cliente"),
    APLICACOES("Aplicações de marca"),
    MIDIA("Mídia e conteúdo"),
    CORTESIAS("Cortesias"),
    CREDENCIAMENTO("Credenciamento"),
    PESQUISA("Pesquisa da ativação"),
    CONTRATO("Contrato");

    private final String label;

    Aba(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
