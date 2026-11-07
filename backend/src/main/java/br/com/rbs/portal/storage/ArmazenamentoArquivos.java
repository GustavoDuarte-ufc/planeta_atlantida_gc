package br.com.rbs.portal.storage;

import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.util.Optional;

/** Onde os documentos enviados ficam guardados: pasta do computador (padrão) ou MongoDB (GridFS). */
public interface ArmazenamentoArquivos {

    void gravar(Long patrocinadorId, String chave, InputStream conteudo, String contentType) throws IOException;

    /** Lança ResponseStatusException 404 se o arquivo não existe mais. */
    Resource ler(Long patrocinadorId, String chave);

    void remover(Long patrocinadorId, String chave);

    /** Caminho no disco, quando existe (usado para copiar ao SharePoint sem criar cópia temporária). */
    default Optional<Path> caminhoLocal(Long patrocinadorId, String chave) {
        return Optional.empty();
    }

    String descricao();
}
