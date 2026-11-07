package br.com.rbs.portal.instagram;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Sorts;
import jakarta.annotation.PreDestroy;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Leitura (somente leitura!) das coleções gravadas pela API de coleta. Nunca escreve no banco.
 * A conexão só é aberta na primeira consulta; sem MONGODB_URI o recurso fica desligado.
 */
@Component
public class MongoInstagramFonte implements InstagramFonte {

    private static final Logger log = LoggerFactory.getLogger(MongoInstagramFonte.class);
    /** Aceita "+0000" (sem dois-pontos), como no campo timestamp_publicacao. */
    private static final DateTimeFormatter OFFSET_SEM_DOIS_PONTOS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssZ");

    @Value("${portal.instagram.enabled:true}")
    private boolean enabled;
    @Value("${portal.instagram.mongo-uri:}")
    private String uri;
    @Value("${portal.instagram.database:instagram}")
    private String database;
    @Value("${portal.instagram.colecao-perfis:perfis}")
    private String colecaoPerfis;
    @Value("${portal.instagram.colecao-posts:posts}")
    private String colecaoPosts;

    private MongoClient client;

    @Override
    public boolean configurado() {
        return enabled && uri != null && !uri.isBlank();
    }

    private synchronized MongoClient client() {
        if (client == null) {
            MongoClientSettings s = MongoClientSettings.builder()
                    .applyConnectionString(new ConnectionString(uri))
                    .applyToClusterSettings(b -> b.serverSelectionTimeout(5, TimeUnit.SECONDS))
                    .applyToSocketSettings(b -> b.connectTimeout(5, TimeUnit.SECONDS).readTimeout(15, TimeUnit.SECONDS))
                    .build();
            client = MongoClients.create(s);
        }
        return client;
    }

    @PreDestroy
    void fechar() {
        if (client != null) {
            client.close();
        }
    }

    @Override
    public void testar() {
        client().getDatabase(database).runCommand(new Document("ping", 1));
    }

    @Override
    public Map<String, Object> diagnosticar() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("banco", database);
        out.put("colecaoPerfis", colecaoPerfis);
        out.put("colecaoPosts", colecaoPosts);
        if (!configurado()) {
            out.put("ok", false);
            out.put("dica", "MONGODB_URI não está definida. Preencha backend/config/application.yml (ou a variável de ambiente) e reinicie o back-end.");
            return out;
        }
        try {
            testar();
            out.put("ok", true);
        } catch (Exception e) {
            out.put("ok", false);
            out.put("dica", dica(e));
            log.warn("Diagnóstico do MongoDB falhou: {}", e.getClass().getSimpleName());
            return out;
        }
        List<String> colecoes = new ArrayList<>();
        try {
            client().getDatabase(database).listCollectionNames().forEach(colecoes::add);
        } catch (Exception e) {
            out.put("avisoColecoes", "Conectou, mas o usuário não pode listar as coleções deste banco.");
        }
        out.put("colecoes", colecoes);
        out.put("colecaoPerfisExiste", colecoes.contains(colecaoPerfis));
        out.put("colecaoPostsExiste", colecoes.contains(colecaoPosts));
        List<String> bancos = new ArrayList<>();
        try {
            client().listDatabaseNames().forEach(bancos::add);
        } catch (Exception e) {
            // usuário sem permissão de listar bancos: ok, o banco configurado é usado mesmo assim
        }
        out.put("bancos", bancos);
        out.put("bancoExiste", bancos.isEmpty() || bancos.contains(database));
        return out;
    }

    /** Traduz a falha em um próximo passo. Não devolve a mensagem original (pode citar host/usuário). */
    static String dica(Exception e) {
        String nome = e.getClass().getSimpleName();
        if (nome.contains("Timeout")) {
            return "Sem resposta do Atlas. Libere o IP desta máquina em Network Access (ou verifique a internet/VPN).";
        }
        if (nome.contains("Security") || String.valueOf(e.getMessage()).toLowerCase().contains("auth")) {
            return "Usuário ou senha recusados. Confira os dados em Database Access (atenção a caracteres especiais na senha).";
        }
        if (nome.contains("Configuration") || nome.contains("IllegalArgument")) {
            return "A MONGODB_URI parece inválida. Ela deve começar com mongodb+srv:// ou mongodb://.";
        }
        return "Falha ao conectar (" + nome + "). Veja o log do back-end para detalhes.";
    }

    @Override
    public List<PerfilDia> perfis(String username, int max) {
        MongoCollection<Document> c = client().getDatabase(database).getCollection(colecaoPerfis);
        List<PerfilDia> out = new ArrayList<>();
        for (Document d : c.find(Filters.eq("username", username)).sort(Sorts.descending("data")).limit(max)) {
            LocalDate data = data(d.get("data"));
            if (data == null) {
                continue;
            }
            out.add(new PerfilDia(username, data, longo(d.get("seguidores")), longo(d.get("publicacoes"))));
        }
        return out;
    }

    @Override
    public List<PostIg> posts(String username, int max) {
        MongoCollection<Document> c = client().getDatabase(database).getCollection(colecaoPosts);
        List<PostIg> out = new ArrayList<>();
        for (Document d : c.find(Filters.eq("username", username)).sort(Sorts.descending("timestamp_publicacao")).limit(max)) {
            Instant publicado = instante(d.get("timestamp_publicacao"));
            if (publicado == null) {
                continue;
            }
            out.add(new PostIg(texto(d.get("post_id")), username, longo(d.get("curtidas")), longo(d.get("comentarios")),
                    longo(d.get("compartilhamentos")), texto(d.get("legenda")), publicado, texto(d.get("tipo")),
                    instante(d.get("ultima_atualizacao")), texto(d.get("url"))));
        }
        return out;
    }

    // ---- Conversões tolerantes: o banco pode guardar número como int/long/double/texto e data como texto ou Date

    static Long longo(Object o) {
        if (o instanceof Number n) {
            return n.longValue();
        }
        if (o instanceof String s) {
            try {
                return Long.parseLong(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    static String texto(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    static LocalDate data(Object o) {
        try {
            if (o instanceof Date d) {
                return d.toInstant().atZone(ZoneOffset.UTC).toLocalDate();
            }
            if (o instanceof String s && s.length() >= 10) {
                return LocalDate.parse(s.substring(0, 10));
            }
        } catch (DateTimeParseException e) {
            log.debug("Data inválida no MongoDB: {}", o);
        }
        return null;
    }

    static Instant instante(Object o) {
        try {
            if (o instanceof Date d) {
                return d.toInstant();
            }
            if (o instanceof String s) {
                String t = s.trim();
                try {
                    return OffsetDateTime.parse(t).toInstant();
                } catch (DateTimeParseException e) {
                    return OffsetDateTime.parse(t, OFFSET_SEM_DOIS_PONTOS).toInstant();
                }
            }
        } catch (DateTimeParseException e) {
            log.debug("Data/hora inválida no MongoDB: {}", o);
        }
        return null;
    }
}
