package br.com.rbs.portal.domain;

import java.util.EnumSet;
import java.util.Set;

import static br.com.rbs.portal.domain.Aba.*;

/**
 * Nível de cota -> módulo de informação disponível.
 * MASTER: completo (6 em 2026) | SUBCOTA_G: intermediário (5) | SUBCOTA: básico (20).
 * ASSUNÇÃO DO MVP: o TAP não detalha quais abas cada cota recebe; ajuste aqui conforme o plano comercial.
 */
public enum Cota {
    MASTER("Master", EnumSet.allOf(Aba.class)),
    SUBCOTA_G("Subcota G", EnumSet.of(PERFIL, MIDIA, CORTESIAS, PESQUISA, CONTRATO)),
    SUBCOTA("Subcota", EnumSet.of(PERFIL, MIDIA, PESQUISA));

    private final String label;
    private final Set<Aba> abas;

    Cota(String label, Set<Aba> abas) {
        this.label = label;
        this.abas = abas;
    }

    public String getLabel() {
        return label;
    }

    public Set<Aba> getAbas() {
        return abas;
    }

    public boolean permite(Aba aba) {
        return abas.contains(aba);
    }
}
