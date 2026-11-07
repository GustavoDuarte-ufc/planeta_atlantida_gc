package br.com.rbs.portal.storage;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.gridfs.GridFSBucket;
import com.mongodb.client.gridfs.GridFSBuckets;
import com.mongodb.client.gridfs.model.GridFSFile;
import com.mongodb.client.gridfs.model.GridFSUploadOptions;
import jakarta.annotation.PreDestroy;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.InputStream;
import java.util.concurrent.TimeUnit;

import static com.mongodb.client.model.Filters.eq;

/**
 * Guarda os documentos no MongoDB (GridFS), num banco próprio (portal.storage.mongo-database),
 * separado das coleções do Instagram. O usuário do Atlas precisa de permissão de escrita nesse banco.
 */
@Component
@ConditionalOnProperty(name = "portal.storage.tipo", havingValue = "mongo")
public class ArmazenamentoMongo implements ArmazenamentoArquivos {

    private final String uri;
    private final String banco;
    private MongoClient client;
    private GridFSBucket bucket;

    public ArmazenamentoMongo(@Value("${portal.storage.mongo-uri:${portal.instagram.mongo-uri:}}") String uri,
                              @Value("${portal.storage.mongo-database:portal_arquivos}") String banco) {
        if (uri == null || uri.isBlank()) {
            throw new IllegalStateException("portal.storage.tipo=mongo exige portal.instagram.mongo-uri (ou portal.storage.mongo-uri).");
        }
        this.uri = uri;
        this.banco = banco;
    }

    private synchronized GridFSBucket bucket() {
        if (bucket == null) {
            client = MongoClients.create(MongoClientSettings.builder()
                    .applyConnectionString(new ConnectionString(uri))
                    .applyToClusterSettings(b -> b.serverSelectionTimeout(8, TimeUnit.SECONDS))
                    .build());
            bucket = GridFSBuckets.create(client.getDatabase(banco), "arquivos");
        }
        return bucket;
    }

    @PreDestroy
    void fechar() {
        if (client != null) {
            client.close();
        }
    }

    private static String nome(Long pid, String chave) {
        return pid + "/" + chave;
    }

    @Override
    public void gravar(Long pid, String chave, InputStream conteudo, String contentType) {
        bucket().uploadFromStream(nome(pid, chave), conteudo,
                new GridFSUploadOptions().metadata(new Document("contentType", contentType).append("patrocinadorId", pid)));
    }

    @Override
    public Resource ler(Long pid, String chave) {
        GridFSBucket b = bucket();
        GridFSFile f = b.find(eq("filename", nome(pid, chave))).first();
        if (f == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Arquivo não está mais disponível");
        }
        return new InputStreamResource(b.openDownloadStream(f.getObjectId()));
    }

    @Override
    public void remover(Long pid, String chave) {
        try {
            GridFSBucket b = bucket();
            GridFSFile f = b.find(eq("filename", nome(pid, chave))).first();
            if (f != null) {
                b.delete(f.getObjectId());
            }
        } catch (RuntimeException ignored) {
            // registro já removido; arquivo órfão não afeta o usuário
        }
    }

    @Override
    public String descricao() {
        return "MongoDB (GridFS, banco " + banco + ")";
    }
}
