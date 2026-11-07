package br.com.rbs.portal.service;

import java.text.Normalizer;
import java.util.*;

/**
 * Busca por relevância (tf·idf) simples e sem dependências, suficiente para FAQ e manual em português:
 * ignora acentos e maiúsculas, remove palavras comuns e compara pelo radical (5 primeiras letras).
 * É o "R" do RAG: encontra os trechos que alimentam a resposta (do FAQ direto ou do modelo de IA).
 */
public final class BuscaTextual {

    private static final Set<String> STOP = Set.of(
            "para", "como", "qual", "quais", "quando", "onde", "quem", "porque", "pelo", "pela", "pelos", "pelas",
            "uma", "uns", "umas", "que", "com", "sem", "sob", "sobre", "nos", "nas", "das", "dos", "dele", "dela",
            "esta", "este", "esse", "essa", "isso", "isto", "aqui", "meu", "minha", "seu", "sua", "tem", "ter",
            "foi", "ser", "sao", "estao", "pode", "posso", "preciso", "devo", "fazer", "faco", "mais", "muito",
            "ate", "por", "ele", "ela", "nao", "sim", "ja", "ou", "mas", "se", "de", "da", "do", "em", "no", "na",
            "um", "os", "as", "ao", "aos", "eu", "voce", "vou", "sera", "existe", "tenho", "queria", "gostaria");

    private BuscaTextual() {
    }

    public record Trecho(String titulo, String texto) {
    }

    public record Achado(Trecho trecho, double pontos) {
    }

    public static String normalizar(String s) {
        String n = Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return n.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }

    /** Radicais significativos do texto (sem palavras comuns). */
    public static List<String> termos(String s) {
        List<String> out = new ArrayList<>();
        for (String t : normalizar(s).split(" ")) {
            if (t.length() < 3 || STOP.contains(t)) {
                continue;
            }
            out.add(t.length() > 5 ? t.substring(0, 5) : t);
        }
        return out;
    }

    /** Quebra um texto longo em trechos de até ~900 caracteres, respeitando parágrafos. */
    public static List<Trecho> trechos(String titulo, String conteudo) {
        List<Trecho> out = new ArrayList<>();
        StringBuilder atual = new StringBuilder();
        for (String par : conteudo.split("\\R{2,}|\\R(?=#{1,6}\\s)")) {
            String p = par.trim();
            if (p.isEmpty()) {
                continue;
            }
            if (atual.length() > 0 && atual.length() + p.length() > 900) {
                out.add(new Trecho(titulo, atual.toString().trim()));
                atual.setLength(0);
            }
            while (p.length() > 900) { // parágrafo gigante: corta no último espaço
                int corte = p.lastIndexOf(' ', 900);
                if (corte < 300) {
                    corte = 900;
                }
                out.add(new Trecho(titulo, p.substring(0, corte).trim()));
                p = p.substring(corte).trim();
            }
            atual.append(p).append("\n\n");
        }
        if (atual.toString().isBlank() == false) {
            out.add(new Trecho(titulo, atual.toString().trim()));
        }
        return out;
    }

    /** Ordena os trechos pela relevância para a consulta; descarta os sem nenhum termo em comum. */
    public static List<Achado> buscar(String consulta, List<Trecho> corpus, int max) {
        List<String> q = termos(consulta);
        if (q.isEmpty() || corpus.isEmpty()) {
            return List.of();
        }
        List<Set<String>> corpoTermos = new ArrayList<>();
        List<Map<String, Integer>> freq = new ArrayList<>();
        Map<String, Integer> df = new HashMap<>();
        for (Trecho t : corpus) {
            Map<String, Integer> f = new HashMap<>();
            for (String x : termos(t.texto())) {
                f.merge(x, 1, Integer::sum);
            }
            freq.add(f);
            corpoTermos.add(new HashSet<>(termos(t.titulo())));
            for (String x : f.keySet()) {
                df.merge(x, 1, Integer::sum);
            }
        }
        int n = corpus.size();
        List<Achado> out = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            double pontos = 0;
            int casados = 0;
            for (String termo : new LinkedHashSet<>(q)) {
                int tf = freq.get(i).getOrDefault(termo, 0);
                boolean noTitulo = corpoTermos.get(i).contains(termo);
                if (tf == 0 && !noTitulo) {
                    continue;
                }
                casados++;
                double idf = Math.log(1.0 + (double) n / (1 + df.getOrDefault(termo, 0)));
                pontos += (1 + Math.log(1 + tf)) * idf + (noTitulo ? 2 * idf : 0);
            }
            if (casados > 0) {
                pontos *= (double) casados / new LinkedHashSet<>(q).size() + 0.25; // premia cobrir mais termos
                out.add(new Achado(corpus.get(i), pontos));
            }
        }
        out.sort(Comparator.comparingDouble(Achado::pontos).reversed());
        return out.size() > max ? out.subList(0, max) : out;
    }
}
