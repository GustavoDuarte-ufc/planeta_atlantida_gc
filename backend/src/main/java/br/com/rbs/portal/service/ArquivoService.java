package br.com.rbs.portal.service;

import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.integration.SharePointSyncService;
import br.com.rbs.portal.repository.ArquivoRepository;
import br.com.rbs.portal.storage.ArmazenamentoArquivos;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class ArquivoService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ArquivoService.class);

    /** Extensões que nunca aceitamos (executáveis/scripts). */
    private static final Pattern BLOQUEADAS =
            Pattern.compile("\\.(exe|bat|cmd|com|msi|sh|jar|js|vbs|ps1|scr|dll)$");

    private final ArquivoRepository repo;
    private final AcessoService acesso;
    private final HistoricoService historico;
    private final AlertaService alertas;
    private final SharePointSyncService sharePoint;
    private final ArmazenamentoArquivos armazenamento;

    public ArquivoService(ArquivoRepository repo, AcessoService acesso, HistoricoService historico,
                          AlertaService alertas, SharePointSyncService sharePoint,
                          ArmazenamentoArquivos armazenamento) {
        this.repo = repo;
        this.acesso = acesso;
        this.historico = historico;
        this.alertas = alertas;
        this.sharePoint = sharePoint;
        this.armazenamento = armazenamento;
    }

    @Transactional
    public Arquivo salvar(Long patrocinadorId, Categoria categoria, MultipartFile arquivo) {
        Patrocinador p = acesso.acessarAba(patrocinadorId, categoria.getAba());
        Usuario u = acesso.atual();
        boolean rbs = u.getRole() == Role.ADMIN_RBS;
        if (!rbs && !categoria.isPatrocinadorPode()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Somente a RBS pode enviar este tipo de arquivo");
        }
        if (arquivo == null || arquivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo vazio");
        }

        String nome = Paths.get(Objects.requireNonNullElse(arquivo.getOriginalFilename(), "arquivo"))
                .getFileName().toString();
        if (BLOQUEADAS.matcher(nome.toLowerCase()).find()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de arquivo não permitido");
        }

        String armazenado = UUID.randomUUID().toString();
        try (InputStream in = arquivo.getInputStream()) {
            armazenamento.gravar(p.getId(), armazenado, in, arquivo.getContentType());
        } catch (IOException | RuntimeException e) {
            log.warn("Falha ao gravar '{}' em {}: {}", nome, armazenamento.descricao(), e.toString());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Falha ao gravar o arquivo. Se o armazenamento é o MongoDB, confira se o usuário tem permissão de escrita.");
        }

        Arquivo a = new Arquivo();
        a.setPatrocinador(p);
        a.setAba(categoria.getAba());
        a.setCategoria(categoria);
        a.setNomeOriginal(nome);
        a.setNomeArmazenado(armazenado);
        a.setContentType(arquivo.getContentType());
        a.setTamanho(arquivo.getSize());
        a.setEnviadoPor(u.getEmail());
        a.setOrigem(u.getRole());
        repo.save(a);
        historico.registrar(p, "UPLOAD", categoria.getLabel() + ": " + nome);

        // Automação: avisa o outro lado e copia para o SharePoint (se configurado)
        if (rbs) {
            alertas.notificar(p, Role.ADMIN_PATROCINADOR, TipoAlerta.ATUALIZACAO,
                    "Novo documento disponível", categoria.getLabel() + ": " + nome);
        } else {
            alertas.notificar(p, Role.ADMIN_RBS, TipoAlerta.ATUALIZACAO,
                    p.getNome() + " enviou um arquivo", categoria.getLabel() + ": " + nome + " (por " + u.getEmail() + ")");
        }
        copiarParaSharePoint(p, categoria, nome, armazenado, arquivo);
        return a;
    }

    /** Carrega o arquivo validando o acesso ao patrocinador dono dele. */
    public Arquivo buscar(Long arquivoId) {
        Arquivo a = repo.findById(arquivoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Arquivo não encontrado"));
        acesso.acessarAba(a.getPatrocinador().getId(), a.getAba());
        return a;
    }

    public Resource recurso(Arquivo a) {
        return armazenamento.ler(a.getPatrocinador().getId(), a.getNomeArmazenado());
    }

    /** Em segundo plano, nunca quebra o upload. No MongoDB cria uma cópia temporária só se o SharePoint está ligado. */
    private void copiarParaSharePoint(Patrocinador p, Categoria categoria, String nome, String chave, MultipartFile arquivo) {
        if (!sharePoint.habilitado()) {
            return;
        }
        try {
            Path caminho = armazenamento.caminhoLocal(p.getId(), chave).orElse(null);
            if (caminho == null) {
                caminho = Files.createTempFile("portal-", ".tmp");
                arquivo.transferTo(caminho);
                caminho.toFile().deleteOnExit();
            }
            sharePoint.sincronizar(p.getNome(), categoria.getLabel(), nome, caminho);
        } catch (IOException | RuntimeException e) {
            log.warn("SharePoint: não foi possível preparar '{}': {}", nome, e.getMessage());
        }
    }

    @Transactional
    public void remover(Long arquivoId) {
        Arquivo a = buscar(arquivoId);
        Usuario u = acesso.atual();
        boolean autor = a.getEnviadoPor().equalsIgnoreCase(u.getEmail());
        if (u.getRole() != Role.ADMIN_RBS && !autor) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Só é possível remover arquivos enviados por você");
        }
        repo.delete(a);
        historico.registrar(a.getPatrocinador(), "REMOVEU_ARQUIVO", a.getCategoria().getLabel() + ": " + a.getNomeOriginal());
        armazenamento.remover(a.getPatrocinador().getId(), a.getNomeArmazenado());
    }
}
