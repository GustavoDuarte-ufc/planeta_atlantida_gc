package br.com.rbs.portal.domain;

import static br.com.rbs.portal.domain.Aba.*;

/**
 * Tipos de arquivo por aba e quem pode enviar.
 * Admin RBS pode enviar qualquer categoria; Admin Patrocinador somente as marcadas com patrocinadorPode.
 */
public enum Categoria {
    PLANO_COMERCIAL(PERFIL, "Plano comercial", false),
    COMPRA_INGRESSOS(PERFIL, "Documento de compra de ingressos (valor patrocinador)", true),
    MIV(APLICACOES, "MIV", true),
    LOGO(APLICACOES, "Logo", true),
    FOTO_COMPROVACAO(APLICACOES, "Fotos de comprovação da marca no evento", false),
    MATERIAL_MIDIA(MIDIA, "Materiais enviados pelo cliente", true),
    RELATORIO_MIDIA(MIDIA, "Relatórios de mídia veiculada (RBS)", false),
    RESULTADO_PESQUISA(PESQUISA, "Resultados da pesquisa (instituto)", false),
    CONTRATO_ASSINADO(CONTRATO, "Contrato final assinado", true);

    private final Aba aba;
    private final String label;
    private final boolean patrocinadorPode;

    Categoria(Aba aba, String label, boolean patrocinadorPode) {
        this.aba = aba;
        this.label = label;
        this.patrocinadorPode = patrocinadorPode;
    }

    public Aba getAba() {
        return aba;
    }

    public String getLabel() {
        return label;
    }

    public boolean isPatrocinadorPode() {
        return patrocinadorPode;
    }
}
