package br.com.rbs.portal.service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Preenche um modelo de contrato trocando {{variavel}} pelo valor. Variáveis sem valor (ou vazio) ficam
 * como estão no texto e são devolvidas em {@code pendentes}, para a RBS completar antes de emitir.
 * Passagem única: o valor inserido nunca é reinterpretado como nova variável.
 */
public final class ModeloRenderer {

    public static final Pattern VARIAVEL = Pattern.compile("\\{\\{\\s*([A-Za-z0-9_.]+)\\s*}}");

    private ModeloRenderer() {
    }

    public record Resultado(String texto, List<String> pendentes) {
    }

    public static Resultado renderizar(String modelo, Map<String, String> valores) {
        Set<String> pendentes = new LinkedHashSet<>();
        Matcher m = VARIAVEL.matcher(modelo);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String chave = m.group(1);
            String valor = valores.get(chave);
            if (valor == null || valor.isBlank()) {
                pendentes.add(chave);
                m.appendReplacement(sb, Matcher.quoteReplacement(m.group()));
            } else {
                m.appendReplacement(sb, Matcher.quoteReplacement(valor.trim()));
            }
        }
        m.appendTail(sb);
        return new Resultado(sb.toString(), List.copyOf(pendentes));
    }

    /** Variáveis usadas no modelo, na ordem em que aparecem. */
    public static List<String> variaveis(String modelo) {
        Set<String> out = new LinkedHashSet<>();
        Matcher m = VARIAVEL.matcher(modelo);
        while (m.find()) {
            out.add(m.group(1));
        }
        return List.copyOf(out);
    }
}
