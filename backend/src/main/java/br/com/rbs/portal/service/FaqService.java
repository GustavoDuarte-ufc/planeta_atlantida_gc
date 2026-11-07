package br.com.rbs.portal.service;

import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.dto.ConhecimentoDtos.Fonte;
import br.com.rbs.portal.dto.ConhecimentoDtos.RespostaRes;
import br.com.rbs.portal.integration.IaClient;
import br.com.rbs.portal.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Assistente de dúvidas: busca no FAQ e no manual (RBS cadastra) e, se a IA estiver ligada, pede ao modelo
 * que redija a resposta usando apenas esses trechos. Sem IA, devolve o melhor item do FAQ ou o trecho do manual.
 */
@Service
@RequiredArgsConstructor
public class FaqService {

    private static final String SEM_RESPOSTA = "Não encontrei essa informação na base do portal. "
            + "Fale com a equipe da RBS responsável pelo seu projeto; sua pergunta foi registrada para melhorarmos o FAQ.";
    /** Pontuação mínima para considerar que um item do FAQ responde a pergunta. */
    private static final double CORTE_BASE = 1.2;

    private final FaqItemRepository faq;
    private final ConhecimentoDocRepository docs;
    private final FaqPerguntaRepository registros;
    private final IaClient ia;
    private final AcessoService acesso;
    private final RateLimiter limite = new RateLimiter(30, Duration.ofHours(1));

    public RespostaRes perguntar(String pergunta) {
        Usuario u = acesso.atual();
        if (!limite.tentar(u.getEmail().toLowerCase())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, "Muitas perguntas seguidas. Tente em alguns minutos.");
        }

        List<BuscaTextual.Trecho> corpus = new ArrayList<>();
        List<FaqItem> itens = faq.findByAtivoTrueOrderByCategoriaAscIdAsc();
        for (FaqItem f : itens) {
            corpus.add(new BuscaTextual.Trecho("FAQ: " + f.getPergunta(), f.getPergunta() + "\n" + f.getResposta()));
        }
        for (ConhecimentoDoc d : docs.findAllByOrderByCriadoEmDesc()) {
            corpus.addAll(BuscaTextual.trechos(d.getTitulo(), d.getConteudo()));
        }
        List<BuscaTextual.Achado> achados = BuscaTextual.buscar(pergunta, corpus, 4);

        RespostaRes res;
        if (achados.isEmpty()) {
            res = new RespostaRes(SEM_RESPOSTA, "SEM_RESPOSTA", List.of());
        } else {
            List<Fonte> fontes = achados.stream()
                    .map(a -> new Fonte(a.trecho().titulo(), resumo(a.trecho().texto()))).toList();
            Optional<String> viaIa = ia.responder(pergunta, achados.stream().map(a -> a.trecho().titulo() + ": " + a.trecho().texto()).toList());
            if (viaIa.isPresent()) {
                res = new RespostaRes(viaIa.get(), "IA", fontes);
            } else {
                BuscaTextual.Achado melhor = achados.get(0);
                if (melhor.pontos() < CORTE_BASE) {
                    res = new RespostaRes(SEM_RESPOSTA, "SEM_RESPOSTA", List.of());
                } else {
                    String t = melhor.trecho().texto();
                    // Item de FAQ: devolve só a resposta (a 1ª linha é a pergunta repetida)
                    String corpoResposta = melhor.trecho().titulo().startsWith("FAQ: ") && t.contains("\n")
                            ? t.substring(t.indexOf('\n') + 1) : t;
                    res = new RespostaRes(corpoResposta, "BASE", fontes);
                }
            }
        }

        FaqPergunta reg = new FaqPergunta();
        reg.setUsuario(u.getEmail());
        reg.setPergunta(pergunta.trim());
        reg.setResposta(res.resposta().length() > 8000 ? res.resposta().substring(0, 8000) : res.resposta());
        reg.setModo(res.modo());
        registros.save(reg);
        return res;
    }

    private static String resumo(String s) {
        return s.length() > 280 ? s.substring(0, 280).trim() + "…" : s;
    }
}
