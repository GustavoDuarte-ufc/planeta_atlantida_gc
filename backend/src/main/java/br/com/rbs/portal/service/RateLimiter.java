package br.com.rbs.portal.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

/**
 * Limitador simples em memória (janela deslizante) para login e recuperação de senha.
 * Em produção com várias instâncias, troque por Redis/bucket4j.
 */
public class RateLimiter {

    private final int max;
    private final Duration janela;
    private final Map<String, Deque<Instant>> eventos = new HashMap<>();

    public RateLimiter(int max, Duration janela) {
        this.max = max;
        this.janela = janela;
    }

    /** Já houve {@code max} eventos dentro da janela para essa chave? */
    public synchronized boolean excedido(String chave) {
        return podar(chave).size() >= max;
    }

    public synchronized void registrar(String chave) {
        podar(chave).addLast(Instant.now());
    }

    public synchronized void limpar(String chave) {
        eventos.remove(chave);
    }

    /** Registra o evento e diz se ele ainda cabe no limite. */
    public synchronized boolean tentar(String chave) {
        Deque<Instant> d = podar(chave);
        if (d.size() >= max) {
            return false;
        }
        d.addLast(Instant.now());
        return true;
    }

    private Deque<Instant> podar(String chave) {
        Deque<Instant> d = eventos.computeIfAbsent(chave, k -> new ArrayDeque<>());
        Instant corte = Instant.now().minus(janela);
        while (!d.isEmpty() && d.peekFirst().isBefore(corte)) {
            d.removeFirst();
        }
        return d;
    }
}
