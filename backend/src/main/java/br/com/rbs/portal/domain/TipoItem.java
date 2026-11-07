package br.com.rbs.portal.domain;

import static br.com.rbs.portal.domain.Aba.*;

/** Conteúdos em texto/link (não-arquivo) por aba. */
public enum TipoItem {
    TEXTO_MIDIA(MIDIA, true),     // cliente envia material em texto
    LINK_POST(MIDIA, false),      // RBS publica links de posts
    SIGNATARIO(CONTRATO, true);   // cliente informa quem assina

    private final Aba aba;
    private final boolean patrocinadorPode;

    TipoItem(Aba aba, boolean patrocinadorPode) {
        this.aba = aba;
        this.patrocinadorPode = patrocinadorPode;
    }

    public Aba getAba() {
        return aba;
    }

    public boolean isPatrocinadorPode() {
        return patrocinadorPode;
    }
}
