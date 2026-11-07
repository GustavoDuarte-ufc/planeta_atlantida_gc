package br.com.rbs.portal.instagram;

import br.com.rbs.portal.domain.Patrocinador;
import br.com.rbs.portal.dto.InstagramDtos.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/** Junta a fonte (MongoDB) com os cálculos. Cache curto em memória para não consultar o banco a cada clique. */
@Service
public class InstagramService {

    private static final Logger log = LoggerFactory.getLogger(InstagramService.class);
    public static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");
    private static final Pattern HANDLE_OK = Pattern.compile("[a-z0-9._]{1,30}");
    private static final int DIAS = 30;
    private static final int MAX_POSTS = 300;

    private record Cache(long ate, Object valor) {
    }

    private final InstagramFonte fonte;
    private final Map<String, Cache> cache = new ConcurrentHashMap<>();
    private final long ttlMs;
    private final String eventoUsername;

    public InstagramService(InstagramFonte fonte,
                            @Value("${portal.instagram.cache-segundos:300}") long ttl,
                            @Value("${portal.instagram.evento-username:planetaatlantida}") String evento) {
        this.fonte = fonte;
        this.ttlMs = ttl * 1000;
        this.eventoUsername = normalizarHandle(evento);
    }

    /** "@Marca " → "marca". Retorna null se vazio; lança IllegalArgumentException se tiver caracteres inválidos. */
    public static String normalizarHandle(String h) {
        if (h == null) {
            return null;
        }
        String t = h.trim().toLowerCase();
        if (t.contains("instagram.com/")) {
            t = t.substring(t.indexOf("instagram.com/") + 14).replaceAll("[/?#].*$", "");
        }
        if (t.startsWith("@")) {
            t = t.substring(1);
        }
        if (t.isEmpty()) {
            return null;
        }
        if (!HANDLE_OK.matcher(t).matches()) {
            throw new IllegalArgumentException("Perfil do Instagram inválido: use apenas letras, números, ponto e _.");
        }
        return t;
    }

    public Map<String, Object> diagnosticar() {
        limparCache();
        return fonte.diagnosticar();
    }

    public boolean habilitado() {
        return fonte.configurado();
    }

    public String eventoUsername() {
        return eventoUsername;
    }

    /** Resumo do perfil do evento. */
    public InstagramRes evento() {
        if (!fonte.configurado()) {
            return new InstagramRes(false, null, eventoUsername, null, null, null);
        }
        try {
            return new InstagramRes(true, null, eventoUsername, null, resumo(eventoUsername), null);
        } catch (Exception e) {
            return falha(e, null);
        }
    }

    /** Perfil da marca (se cadastrado) + menções à marca nos posts do perfil do evento. */
    public InstagramRes doPatrocinador(Patrocinador p) {
        if (!fonte.configurado()) {
            return new InstagramRes(false, null, eventoUsername, p.getInstagram(), null, null);
        }
        try {
            String h = p.getInstagram();
            Resumo perfil = h == null ? null : resumo(h);
            Mencoes m = h == null ? null : mencoes(h);
            return new InstagramRes(true, null, eventoUsername, h, perfil, m);
        } catch (Exception e) {
            return falha(e, p.getInstagram());
        }
    }

    public Mencoes mencoes(String handle) {
        List<PostIg> doEvento = postsCache(eventoUsername);
        List<PostIg> achados = InstagramMetricas.mencoes(handle, doEvento);
        long seg = seguidoresAtuais(eventoUsername);
        return new Mencoes(achados.size(), achados.stream().mapToLong(PostIg::interacoes).sum(),
                achados.stream().limit(10).map(x -> InstagramMetricas.post(x, seg)).toList());
    }

    /** Posts recentes do evento (usado pelo job de menções). */
    public List<PostIg> postsDoEvento() {
        return postsCache(eventoUsername);
    }

    public Object paraRelatorio(Patrocinador p) {
        InstagramRes r = doPatrocinador(p);
        if (!r.habilitado() || r.erro() != null || p.getInstagram() == null) {
            return null;
        }
        return r;
    }

    private InstagramRes falha(Exception e, String handle) {
        log.warn("Falha ao ler o MongoDB do Instagram: {}", e.toString());
        return new InstagramRes(true, "Não consegui consultar o banco do Instagram agora.", eventoUsername, handle, null, null);
    }

    private Resumo resumo(String username) {
        return cached("resumo:" + username, () -> InstagramMetricas.calcular(username,
                fonte.perfis(username, DIAS + 10), fonte.posts(username, MAX_POSTS), DIAS, LocalDate.now(ZONA), ZONA));
    }

    private List<PostIg> postsCache(String username) {
        return cached("posts:" + username, () -> fonte.posts(username, MAX_POSTS));
    }

    private long seguidoresAtuais(String username) {
        Resumo r = resumo(username);
        return r.seguidores() == null ? 0 : r.seguidores();
    }

    @SuppressWarnings("unchecked")
    private <T> T cached(String chave, java.util.function.Supplier<T> carga) {
        long agora = System.currentTimeMillis();
        Cache c = cache.get(chave);
        if (c != null && c.ate() > agora) {
            return (T) c.valor();
        }
        T v = carga.get();
        cache.put(chave, new Cache(agora + ttlMs, v));
        return v;
    }

    public void limparCache() {
        cache.clear();
    }
}
