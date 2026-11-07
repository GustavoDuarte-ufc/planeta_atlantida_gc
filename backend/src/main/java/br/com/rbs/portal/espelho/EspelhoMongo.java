package br.com.rbs.portal.espelho;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import jakarta.annotation.PreDestroy;
import org.bson.Document;
import org.bson.types.Binary;
import org.bson.types.Decimal128;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Espelho dos dados do sistema no MongoDB. O H2 continua sendo o banco de trabalho; este componente
 * copia cada tabela para uma coleção "sistema_<tabela>" (banco portal.espelho.mongo-database) e,
 * se o banco local estiver vazio na inicialização, restaura tudo a partir do Mongo.
 * Desligado por padrão: portal.espelho.ativo=true.
 */
@Component
@Order(-10)
public class EspelhoMongo implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(EspelhoMongo.class);
    private static final String PREFIXO = "sistema_";

    private final JdbcTemplate jdbc;
    private final boolean ativo;
    private final String uri;
    private final String banco;

    private MongoClient client;
    private volatile boolean liberado = false;
    private final Map<String, Integer> ultimoHash = new HashMap<>();
    private String ultimoResumo = "ainda não sincronizado";

    public EspelhoMongo(JdbcTemplate jdbc,
                        @Value("${portal.espelho.ativo:false}") boolean ativo,
                        @Value("${portal.espelho.mongo-uri:${portal.instagram.mongo-uri:}}") String uri,
                        @Value("${portal.espelho.mongo-database:portal_dados}") String banco) {
        this.jdbc = jdbc;
        this.ativo = ativo;
        this.uri = uri;
        String nome = banco == null ? "" : banco.trim();
        if (nome.isEmpty() || nome.matches(".*[/\\\\. \"$:@].*")) {
            log.error("Espelho MongoDB: nome de banco inválido ('{}'); usando 'portal_dados'. "
                    + "Confira portal.espelho.mongo-database no application.yml (é só o NOME do banco, não a URI).", nome);
            nome = "portal_dados";
        }
        this.banco = nome;
    }

    public boolean ativo() {
        return ativo;
    }

    public String descricao() {
        return ativo ? "Espelho no MongoDB (banco " + banco + "): " + ultimoResumo : "desligado";
    }

    private synchronized MongoDatabase db() {
        if (client == null) {
            client = MongoClients.create(MongoClientSettings.builder()
                    .applyConnectionString(new ConnectionString(uri))
                    .applyToClusterSettings(b -> b.serverSelectionTimeout(8, TimeUnit.SECONDS))
                    .build());
        }
        return client.getDatabase(banco);
    }

    /** Roda antes dos seeders (ordem negativa): restaura se o banco local estiver vazio. */
    @Override
    public void run(String... args) {
        if (!ativo) {
            return;
        }
        if (uri == null || uri.isBlank()) {
            log.warn("portal.espelho.ativo=true mas não há URI do Mongo; espelho desligado");
            return;
        }
        try {
            if (totalLocal() == 0 && totalRemoto() > 0) {
                restaurar();
            }
            liberado = true;
        } catch (RuntimeException e) {
            // Não libera o backup: evita sobrescrever o Mongo com um banco local vazio ou incompleto.
            log.error("Espelho MongoDB: falha ao restaurar, backup desativado nesta execução: {}", e.getMessage(), e);
        }
    }

    @Scheduled(initialDelayString = "${portal.espelho.intervalo-ms:120000}", fixedDelayString = "${portal.espelho.intervalo-ms:120000}")
    public void sincronizar() {
        if (!ativo || !liberado) {
            return;
        }
        try {
            ultimoResumo = copiarParaMongo();
        } catch (RuntimeException e) {
            ultimoResumo = "falhou: " + e.getMessage() + " (banco " + banco + ")";
            log.warn("Espelho MongoDB: sincronização falhou: {}", e.getMessage());
        }
    }

    @PreDestroy
    void aoDesligar() {
        try {
            sincronizar();
        } finally {
            if (client != null) {
                client.close();
            }
        }
    }

    // ---------- local -> Mongo ----------

    private List<String> tabelas() {
        return jdbc.queryForList(
                "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
                String.class);
    }

    private long totalLocal() {
        long total = 0;
        for (String t : tabelas()) {
            Long n = jdbc.queryForObject("SELECT COUNT(*) FROM \"" + t + "\"", Long.class);
            total += n == null ? 0 : n;
        }
        return total;
    }

    private long totalRemoto() {
        long total = 0;
        MongoDatabase d = db();
        for (String nome : d.listCollectionNames()) {
            if (nome.startsWith(PREFIXO)) {
                total += d.getCollection(nome).countDocuments();
            }
        }
        return total;
    }

    private String copiarParaMongo() {
        MongoDatabase d = db();
        int tabelasAlteradas = 0;
        long linhas = 0;
        for (String t : tabelas()) {
            List<Document> docs = new ArrayList<>();
            for (Map<String, Object> linha : jdbc.queryForList("SELECT * FROM \"" + t + "\"")) {
                Document doc = new Document();
                for (Map.Entry<String, Object> e : linha.entrySet()) {
                    doc.put(e.getKey(), paraMongo(e.getValue()));
                }
                docs.add(doc);
            }
            linhas += docs.size();
            int hash = docs.hashCode();
            Integer anterior = ultimoHash.get(t);
            if (anterior != null && anterior == hash) {
                continue;
            }
            MongoCollection<Document> col = d.getCollection(PREFIXO + t.toLowerCase());
            col.deleteMany(new Document());
            if (!docs.isEmpty()) {
                col.insertMany(docs);
            }
            ultimoHash.put(t, hash);
            tabelasAlteradas++;
        }
        return linhas + " registro(s), " + tabelasAlteradas + " tabela(s) atualizada(s) às " + LocalDateTime.now().withNano(0);
    }

    private static Object paraMongo(Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof java.sql.Timestamp ts) {
            return ts.toLocalDateTime().toString();
        }
        if (v instanceof java.sql.Date dt) {
            return dt.toLocalDate().toString();
        }
        if (v instanceof java.sql.Time tm) {
            return tm.toLocalTime().toString();
        }
        if (v instanceof OffsetDateTime || v instanceof LocalDateTime || v instanceof LocalDate || v instanceof LocalTime) {
            return v.toString();
        }
        if (v instanceof byte[] b) {
            return new Binary(b);
        }
        if (v instanceof BigDecimal bd) {
            return new Decimal128(bd);
        }
        if (v instanceof Number || v instanceof Boolean || v instanceof String) {
            return v;
        }
        return v.toString();
    }

    // ---------- Mongo -> local ----------

    private void restaurar() {
        log.info("Banco local vazio: restaurando dados do MongoDB (banco {})", banco);
        MongoDatabase d = db();
        Map<String, Map<String, String>> tipos = tiposDasColunas();
        Map<String, List<String>> identidades = identidades();

        jdbc.execute((Connection con) -> {
            try (Statement st = con.createStatement()) {
                st.execute("SET REFERENTIAL_INTEGRITY FALSE");
            }
            long total = 0;
            try {
                for (String t : tabelas()) {
                    MongoCollection<Document> col = d.getCollection(PREFIXO + t.toLowerCase());
                    Map<String, String> tiposTabela = tipos.getOrDefault(t, Map.of());
                    for (Document doc : col.find()) {
                        Map<String, Object> valores = new LinkedHashMap<>();
                        for (Map.Entry<String, Object> e : doc.entrySet()) {
                            String coluna = e.getKey();
                            if ("_id".equals(coluna) || !tiposTabela.containsKey(coluna)) {
                                continue;
                            }
                            valores.put(coluna, doMongo(e.getValue(), tiposTabela.get(coluna)));
                        }
                        if (valores.isEmpty()) {
                            continue;
                        }
                        StringBuilder cols = new StringBuilder();
                        StringBuilder marcas = new StringBuilder();
                        for (String c : valores.keySet()) {
                            cols.append(cols.length() > 0 ? "," : "").append('"').append(c).append('"');
                            marcas.append(marcas.length() > 0 ? ",?" : "?");
                        }
                        try (PreparedStatement ps = con.prepareStatement(
                                "INSERT INTO \"" + t + "\" (" + cols + ") VALUES (" + marcas + ")")) {
                            int i = 1;
                            for (Object val : valores.values()) {
                                ps.setObject(i++, val);
                            }
                            ps.executeUpdate();
                            total++;
                        }
                    }
                    for (String idCol : identidades.getOrDefault(t, List.of())) {
                        try (Statement st = con.createStatement();
                             java.sql.ResultSet rs = st.executeQuery("SELECT COALESCE(MAX(\"" + idCol + "\"),0)+1 FROM \"" + t + "\"")) {
                            rs.next();
                            long proximo = rs.getLong(1);
                            try (Statement alt = con.createStatement()) {
                                alt.execute("ALTER TABLE \"" + t + "\" ALTER COLUMN \"" + idCol + "\" RESTART WITH " + proximo);
                            }
                        }
                    }
                }
            } finally {
                try (Statement st = con.createStatement()) {
                    st.execute("SET REFERENTIAL_INTEGRITY TRUE");
                }
            }
            log.info("Restauração concluída: {} registro(s)", total);
            return null;
        });
    }

    private Map<String, Map<String, String>> tiposDasColunas() {
        Map<String, Map<String, String>> r = new HashMap<>();
        jdbc.query("SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC'",
                rs -> {
                    r.computeIfAbsent(rs.getString(1), k -> new HashMap<>()).put(rs.getString(2), rs.getString(3));
                });
        return r;
    }

    private Map<String, List<String>> identidades() {
        Map<String, List<String>> r = new HashMap<>();
        jdbc.query("SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND IS_IDENTITY = 'YES'",
                rs -> {
                    r.computeIfAbsent(rs.getString(1), k -> new ArrayList<>()).add(rs.getString(2));
                });
        return r;
    }

    private static Object doMongo(Object v, String tipo) {
        if (v == null) {
            return null;
        }
        if (v instanceof Binary b) {
            return b.getData();
        }
        if (v instanceof Decimal128 d) {
            return d.bigDecimalValue();
        }
        String t = tipo == null ? "" : tipo.toUpperCase();
        if (v instanceof String s) {
            if (t.startsWith("TIMESTAMP")) {
                return t.contains("TIME ZONE") ? OffsetDateTime.parse(s) : LocalDateTime.parse(s);
            }
            if (t.equals("DATE")) {
                return LocalDate.parse(s);
            }
            if (t.startsWith("TIME")) {
                return LocalTime.parse(s);
            }
        }
        return v;
    }
}
