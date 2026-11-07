package br.com.rbs.portal.service;

import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

/**
 * Relatório consolidado sem trabalho manual: junta mídia, comprovações, cortesias,
 * credenciamento, pesquisa e contrato em uma estrutura única (a tela imprime/exporta em PDF).
 */
@Service
@RequiredArgsConstructor
public class RelatorioService {

    private final ArquivoRepository arquivos;
    private final ItemConteudoRepository itens;
    private final CortesiaRepository cortesias;
    private final CredenciamentoRepository credenciamentos;
    private final PerguntaPesquisaRepository perguntas;
    private final UsuarioRepository usuarios;
    private final PrazoService prazos;
    private final br.com.rbs.portal.instagram.InstagramService instagram;

    /** % de abas da cota com o essencial preenchido. */
    public int progresso(Patrocinador p) {
        Set<Aba> abas = p.getCota().getAbas();
        long ok = abas.stream().filter(a -> concluida(p, a)).count();
        return abas.isEmpty() ? 0 : (int) (ok * 100 / abas.size());
    }

    public List<Aba> abasConcluidas(Patrocinador p) {
        return p.getCota().getAbas().stream().filter(a -> concluida(p, a)).sorted().toList();
    }

    public boolean concluida(Patrocinador p, Aba aba) {
        Long id = p.getId();
        return switch (aba) {
            case PERFIL -> arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.PLANO_COMERCIAL) > 0
                    && usuarios.countByPatrocinadorId(id) > 0;
            case APLICACOES -> arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.MIV) > 0
                    && arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.LOGO) > 0;
            case MIDIA -> arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.MATERIAL_MIDIA) > 0
                    || itens.countByPatrocinadorIdAndTipo(id, TipoItem.TEXTO_MIDIA) > 0;
            case CORTESIAS -> !cortesias.findByPatrocinadorIdOrderBySetorAscTipoAsc(id).isEmpty();
            case CREDENCIAMENTO -> !credenciamentos.findByPatrocinadorIdOrderBySetorAsc(id).isEmpty();
            case PESQUISA -> perguntas.findByPatrocinadorIdOrderByOrdem(id).stream()
                    .filter(q -> q.getPergunta() != null && !q.getPergunta().isBlank()).count() == 3;
            case CONTRATO -> itens.countByPatrocinadorIdAndTipo(id, TipoItem.SIGNATARIO) > 0;
        };
    }

    public Map<String, Object> gerar(Patrocinador p) {
        Long id = p.getId();
        List<Map<String, Object>> secoes = new ArrayList<>();

        for (Aba aba : p.getCota().getAbas()) {
            List<String> resumo = new ArrayList<>();
            List<Map<String, Object>> detalhes = new ArrayList<>();

            switch (aba) {
                case PERFIL -> {
                    resumo.add("Cota: " + p.getCota().getLabel());
                    resumo.add("Plano comercial enviado: " + sn(arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.PLANO_COMERCIAL) > 0));
                    resumo.add("Documento de compra de ingressos enviado: " + sn(arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.COMPRA_INGRESSOS) > 0));
                    List<String> emails = usuarios.findByPatrocinadorIdOrderByNome(id).stream()
                            .map(u -> u.getNome() + " <" + u.getEmail() + ">" + (u.isAtivo() ? "" : " (inativo)")).toList();
                    resumo.add("E-mails com acesso: " + emails.size());
                    detalhes.add(bloco("E-mails com acesso", emails));
                }
                case APLICACOES -> {
                    resumo.add("MIV enviado: " + arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.MIV));
                    resumo.add("Logos enviadas: " + arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.LOGO));
                    resumo.add("Fotos de comprovação: " + arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.FOTO_COMPROVACAO));
                    detalhes.add(bloco("Fotos que comprovam a marca aplicada",
                            nomes(arquivos.findByPatrocinadorIdAndCategoriaOrderByCriadoEmDesc(id, Categoria.FOTO_COMPROVACAO))));
                }
                case MIDIA -> {
                    resumo.add("Materiais enviados (arquivos): " + arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.MATERIAL_MIDIA));
                    resumo.add("Materiais enviados (texto): " + itens.countByPatrocinadorIdAndTipo(id, TipoItem.TEXTO_MIDIA));
                    resumo.add("Relatórios de mídia veiculada: " + arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.RELATORIO_MIDIA));
                    resumo.add("Links de posts: " + itens.countByPatrocinadorIdAndTipo(id, TipoItem.LINK_POST));
                    detalhes.add(bloco("Relatórios de mídia",
                            nomes(arquivos.findByPatrocinadorIdAndCategoriaOrderByCriadoEmDesc(id, Categoria.RELATORIO_MIDIA))));
                    detalhes.add(bloco("Links de posts",
                            itens.findByPatrocinadorIdAndTipoOrderByCriadoEmDesc(id, TipoItem.LINK_POST).stream()
                                    .map(i -> i.getTitulo() + " — " + Objects.toString(i.getConteudo(), "")).toList()));
                }
                case CORTESIAS -> {
                    List<Cortesia> lista = cortesias.findByPatrocinadorIdOrderBySetorAscTipoAsc(id);
                    int total = lista.stream().mapToInt(Cortesia::getQuantidade).sum();
                    int dest = lista.stream().mapToInt(Cortesia::getDestinada).sum();
                    resumo.add("Total de cortesias: " + total);
                    resumo.add("Destinadas: " + dest + " (" + (total == 0 ? 0 : dest * 100 / total) + "%)");
                    detalhes.add(bloco("Por setor e tipo", lista.stream()
                            .map(c -> c.getSetor() + " / " + c.getTipo() + ": " + c.getQuantidade() + " (destinadas: " + c.getDestinada() + ")").toList()));
                }
                case CREDENCIAMENTO -> {
                    List<Credenciamento> lista = credenciamentos.findByPatrocinadorIdOrderBySetorAsc(id);
                    resumo.add("Total de credenciais: " + lista.stream().mapToInt(Credenciamento::getQuantidade).sum());
                    detalhes.add(bloco("Por setor", lista.stream().map(c -> c.getSetor() + ": " + c.getQuantidade()).toList()));
                }
                case PESQUISA -> {
                    List<PerguntaPesquisa> lista = perguntas.findByPatrocinadorIdOrderByOrdem(id);
                    long preenchidas = lista.stream().filter(q -> q.getPergunta() != null && !q.getPergunta().isBlank()).count();
                    resumo.add("Perguntas personalizadas preenchidas: " + preenchidas + "/3");
                    resumo.add("Arquivos de resultado do instituto: " + arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.RESULTADO_PESQUISA));
                    detalhes.add(bloco("Perguntas e resultados", lista.stream()
                            .map(q -> q.getOrdem() + ") " + Objects.toString(q.getPergunta(), "(sem pergunta)")
                                    + " → " + (q.getResultado() == null || q.getResultado().isBlank() ? "aguardando resultado" : q.getResultado())).toList()));
                }
                case CONTRATO -> {
                    resumo.add("Signatário informado: " + sn(itens.countByPatrocinadorIdAndTipo(id, TipoItem.SIGNATARIO) > 0));
                    resumo.add("Contrato assinado arquivado: " + sn(arquivos.countByPatrocinadorIdAndCategoria(id, Categoria.CONTRATO_ASSINADO) > 0));
                    detalhes.add(bloco("Signatários", itens.findByPatrocinadorIdAndTipoOrderByCriadoEmDesc(id, TipoItem.SIGNATARIO).stream()
                            .map(i -> i.getTitulo() + (i.getConteudo() == null ? "" : " — " + i.getConteudo().replace('\n', ' '))).toList()));
                }
            }

            Map<String, Object> secao = new LinkedHashMap<>();
            secao.put("aba", aba.name());
            secao.put("titulo", aba.getLabel());
            secao.put("concluida", concluida(p, aba));
            secao.put("resumo", resumo);
            secao.put("detalhes", detalhes);
            secoes.add(secao);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("patrocinador", p.getNome());
        out.put("cota", p.getCota().getLabel());
        out.put("geradoEm", Instant.now());
        out.put("progresso", progresso(p));
        out.put("secoes", secoes);
        out.put("prazos", prazos.dosPatrocinador(id, java.time.LocalDate.now()).stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("titulo", r.titulo());
            m.put("dataLimite", r.dataLimite());
            m.put("status", r.status());
            return m;
        }).toList());
        out.put("instagram", instagram.paraRelatorio(p));
        return out;
    }

    private static String sn(boolean b) {
        return b ? "Sim" : "Não";
    }

    private static List<String> nomes(List<Arquivo> lista) {
        return lista.stream().map(Arquivo::getNomeOriginal).toList();
    }

    private static Map<String, Object> bloco(String titulo, List<String> linhas) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("titulo", titulo);
        m.put("linhas", linhas);
        return m;
    }
}
