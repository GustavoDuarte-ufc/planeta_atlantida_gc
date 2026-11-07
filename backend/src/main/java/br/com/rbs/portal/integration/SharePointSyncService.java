package br.com.rbs.portal.integration;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.file.Path;

/** Copia os arquivos enviados ao portal para o SharePoint, em segundo plano e sem nunca quebrar o upload. */
@Service
@RequiredArgsConstructor
public class SharePointSyncService {

    private static final Logger log = LoggerFactory.getLogger(SharePointSyncService.class);
    private final GraphClient graph;

    public boolean habilitado() {
        return graph.sharePointHabilitado();
    }

    @Async
    public void sincronizar(String patrocinador, String categoria, String nomeOriginal, Path caminho) {
        if (!graph.sharePointHabilitado()) {
            return;
        }
        try {
            graph.enviarArquivoSharePoint(patrocinador + "/" + categoria.replace("/", "-"), nomeOriginal, caminho);
            log.info("SharePoint: '{}' sincronizado ({})", nomeOriginal, patrocinador);
        } catch (Exception e) {
            log.warn("SharePoint: falha ao sincronizar '{}': {}", nomeOriginal, e.getMessage());
        }
    }
}
