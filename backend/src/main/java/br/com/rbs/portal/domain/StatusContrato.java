package br.com.rbs.portal.domain;

public enum StatusContrato {
    MINUTA("Minuta"), ENVIADO("Enviado para assinatura"), ASSINADO("Assinado"), CANCELADO("Cancelado");

    private final String label;

    StatusContrato(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
