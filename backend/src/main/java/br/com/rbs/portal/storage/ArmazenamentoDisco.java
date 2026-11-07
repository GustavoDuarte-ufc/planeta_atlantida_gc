package br.com.rbs.portal.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "portal.storage.tipo", havingValue = "disco", matchIfMissing = true)
public class ArmazenamentoDisco implements ArmazenamentoArquivos {

    private final Path raiz;

    public ArmazenamentoDisco(@Value("${portal.storage-dir}") String storageDir) {
        this.raiz = Paths.get(storageDir).toAbsolutePath().normalize();
    }

    private Path caminho(Long pid, String chave) {
        Path c = raiz.resolve(String.valueOf(pid)).resolve(chave).normalize();
        if (!c.startsWith(raiz)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Caminho inválido");
        }
        return c;
    }

    @Override
    public void gravar(Long pid, String chave, InputStream conteudo, String contentType) throws IOException {
        Path destino = caminho(pid, chave);
        Files.createDirectories(destino.getParent());
        Files.copy(conteudo, destino, StandardCopyOption.REPLACE_EXISTING);
    }

    @Override
    public Resource ler(Long pid, String chave) {
        Path c = caminho(pid, chave);
        if (!Files.exists(c)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Arquivo não está mais disponível");
        }
        return new PathResource(c);
    }

    @Override
    public void remover(Long pid, String chave) {
        try {
            Files.deleteIfExists(caminho(pid, chave));
        } catch (IOException ignored) {
            // registro já removido; arquivo órfão não afeta o usuário
        }
    }

    @Override
    public Optional<Path> caminhoLocal(Long pid, String chave) {
        return Optional.of(caminho(pid, chave));
    }

    @Override
    public String descricao() {
        return "Pasta do computador (" + raiz + ")";
    }
}
