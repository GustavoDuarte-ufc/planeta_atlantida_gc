package br.com.rbs.portal.service;

import br.com.rbs.portal.config.PortalProps;
import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.dto.ContratoDtos.*;
import br.com.rbs.portal.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

/** Gera contratos a partir de modelos configuráveis, preenchendo automaticamente o que o portal já sabe. */
@Service
@RequiredArgsConstructor
public class ContratoService {

    private static final String[] MESES = {"janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
            "agosto", "setembro", "outubro", "novembro", "dezembro"};

    /** Catálogo das variáveis que o portal preenche sozinho (mostrado no editor de modelos). */
    public static final List<VariavelRes> CATALOGO = List.of(
            new VariavelRes("patrocinador.nome", "Nome do patrocinador", "Marca Exemplo S.A."),
            new VariavelRes("patrocinador.cota", "Nível de cota", "Master"),
            new VariavelRes("signatario.nome", "Nome do signatário (aba Contrato)", "Maria da Silva"),
            new VariavelRes("signatario.email", "E-mail do signatário", "maria@exemplo.com"),
            new VariavelRes("signatario.cargo", "Cargo do signatário", "Diretora de Marketing"),
            new VariavelRes("signatario.documento", "Documento (CPF) do signatário", "000.000.000-00"),
            new VariavelRes("evento.nome", "Nome do evento", "Planeta Atlântida"),
            new VariavelRes("evento.data", "Data do evento", "29/01/2027"),
            new VariavelRes("evento.ano", "Ano do evento", "2027"),
            new VariavelRes("data.hoje", "Data de hoje", "02/11/2026"),
            new VariavelRes("data.hoje_extenso", "Data de hoje por extenso", "2 de novembro de 2026"),
            new VariavelRes("cortesias.total", "Total de cortesias do patrocinador", "40"),
            new VariavelRes("credenciais.total", "Total de credenciais do patrocinador", "25"),
            new VariavelRes("empresa.nome", "Razão social da RBS (portal.empresa.nome)", "Empresa RBS Ltda."),
            new VariavelRes("empresa.cnpj", "CNPJ da RBS (portal.empresa.cnpj)", "00.000.000/0001-00"));

    private final ModeloContratoRepository modelos;
    private final ContratoGeradoRepository contratos;
    private final ItemConteudoRepository itens;
    private final CortesiaRepository cortesias;
    private final CredenciamentoRepository credenciamentos;
    private final PortalProps props;
    private final AcessoService acesso;
    private final HistoricoService historico;
    private final AlertaService alertas;
    private final EventoService eventos;

    // ---- Variáveis

    /** Valores automáticos para o patrocinador (só as chaves que têm valor). */
    public Map<String, String> variaveis(Patrocinador p, LocalDate hoje) {
        Map<String, String> v = new LinkedHashMap<>();
        v.put("patrocinador.nome", p.getNome());
        v.put("patrocinador.cota", p.getCota().getLabel());
        itens.findByPatrocinadorIdAndTipoOrderByCriadoEmDesc(p.getId(), TipoItem.SIGNATARIO).stream().findFirst()
                .ifPresent(i -> v.putAll(parseSignatario(i.getTitulo(), i.getConteudo())));
        v.put("evento.nome", eventos.nomeDe(p));
        v.put("evento.data", dataBr(eventos.dataDe(p)));
        v.put("evento.ano", String.valueOf(eventos.dataDe(p).getYear()));
        v.put("data.hoje", dataBr(hoje));
        v.put("data.hoje_extenso", extenso(hoje));
        v.put("cortesias.total", String.valueOf(cortesias.findByPatrocinadorIdOrderBySetorAscTipoAsc(p.getId())
                .stream().mapToInt(Cortesia::getQuantidade).sum()));
        v.put("credenciais.total", String.valueOf(credenciamentos.findByPatrocinadorIdOrderBySetorAsc(p.getId())
                .stream().mapToInt(Credenciamento::getQuantidade).sum()));
        v.put("empresa.nome", props.empresaNome());
        v.put("empresa.cnpj", props.empresaCnpj());
        return v;
    }

    /** Título = nome; conteúdo = linhas "E-mail: ...", "Cargo: ...", "Documento: ...". Tolerante a variações. */
    public static Map<String, String> parseSignatario(String titulo, String conteudo) {
        Map<String, String> v = new LinkedHashMap<>();
        if (titulo != null && !titulo.isBlank()) {
            v.put("signatario.nome", titulo.trim());
        }
        if (conteudo == null) {
            return v;
        }
        for (String linha : conteudo.split("\\R")) {
            int i = linha.indexOf(':');
            if (i < 0) {
                continue;
            }
            String chave = semAcento(linha.substring(0, i).trim().toLowerCase());
            String valor = linha.substring(i + 1).trim();
            if (valor.isEmpty()) {
                continue;
            }
            if (chave.startsWith("e-mail") || chave.equals("email")) {
                v.put("signatario.email", valor);
            } else if (chave.startsWith("cargo")) {
                v.put("signatario.cargo", valor);
            } else if (chave.startsWith("documento") || chave.equals("cpf")) {
                v.put("signatario.documento", valor);
            }
        }
        return v;
    }

    private static String semAcento(String s) {
        return java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }

    public static String dataBr(LocalDate d) {
        return String.format("%02d/%02d/%d", d.getDayOfMonth(), d.getMonthValue(), d.getYear());
    }

    public static String extenso(LocalDate d) {
        return d.getDayOfMonth() + " de " + MESES[d.getMonthValue() - 1] + " de " + d.getYear();
    }

    // ---- Modelos

    @Transactional(readOnly = true)
    public List<ModeloRes> listarModelos() {
        return modelos.findAllByOrderByNomeAsc().stream().map(ContratoService::res).toList();
    }

    @Transactional
    public ModeloRes salvarModelo(Long id, ModeloReq req) {
        ModeloContrato m = id == null ? new ModeloContrato() : modelo(id);
        m.setNome(req.nome().trim());
        m.setDescricao(req.descricao());
        m.setCorpo(req.corpo());
        m.setCota(req.cota());
        if (req.ativo() != null) {
            m.setAtivo(req.ativo());
        }
        m.setAtualizadoEm(Instant.now());
        return res(modelos.save(m));
    }

    /** "Excluir" um modelo apenas o arquiva: contratos já gerados continuam intactos. */
    @Transactional
    public void arquivarModelo(Long id) {
        ModeloContrato m = modelo(id);
        m.setAtivo(false);
        m.setAtualizadoEm(Instant.now());
    }

    public static ModeloRes res(ModeloContrato m) {
        return new ModeloRes(m.getId(), m.getNome(), m.getDescricao(), m.getCorpo(), m.getCota(),
                m.getCota() == null ? null : m.getCota().getLabel(), m.isAtivo(), m.getAtualizadoEm(),
                ModeloRenderer.variaveis(m.getCorpo()));
    }

    private ModeloContrato modelo(Long id) {
        return modelos.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Modelo não encontrado"));
    }

    // ---- Contratos

    @Transactional(readOnly = true)
    public PreviaRes previa(Long patrocinadorId, GerarReq req) {
        Patrocinador p = acesso.acessarAba(patrocinadorId, Aba.CONTRATO);
        ModeloContrato m = modeloUsavel(p, req.modeloId());
        Map<String, String> valores = variaveis(p, LocalDate.now(ZoneId.of("America/Sao_Paulo")));
        aplicarManuais(valores, req.valores());
        var r = ModeloRenderer.renderizar(m.getCorpo(), valores);
        return new PreviaRes(r.texto(), r.pendentes(), valores);
    }

    @Transactional
    public ContratoRes gerar(Long patrocinadorId, GerarReq req) {
        Patrocinador p = acesso.acessarAba(patrocinadorId, Aba.CONTRATO);
        ModeloContrato m = modeloUsavel(p, req.modeloId());
        Map<String, String> valores = variaveis(p, LocalDate.now(ZoneId.of("America/Sao_Paulo")));
        aplicarManuais(valores, req.valores());
        var r = ModeloRenderer.renderizar(m.getCorpo(), valores);
        if (!r.pendentes().isEmpty() && !req.ignorarPendentes()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Faltam valores para: " + String.join(", ", r.pendentes()));
        }
        ContratoGerado c = new ContratoGerado();
        c.setPatrocinador(p);
        c.setModeloId(m.getId());
        c.setModeloNome(m.getNome());
        c.setTitulo(req.titulo() != null && !req.titulo().isBlank() ? req.titulo().trim() : m.getNome() + " — " + p.getNome());
        c.setConteudo(r.texto());
        c.setVersao((int) contratos.countByPatrocinadorIdAndModeloId(p.getId(), m.getId()) + 1);
        c.setCriadoPor(acesso.atual().getEmail());
        contratos.save(c);
        historico.registrar(p, "GEROU_CONTRATO", c.getTitulo() + " (v" + c.getVersao() + ")");
        return ContratoRes.of(c);
    }

    @Transactional(readOnly = true)
    public List<ContratoRes> listar(Long patrocinadorId) {
        acesso.acessarAba(patrocinadorId, Aba.CONTRATO);
        List<ContratoGerado> lista = acesso.isRbs()
                ? contratos.findByPatrocinadorIdOrderByCriadoEmDesc(patrocinadorId)
                : contratos.findByPatrocinadorIdAndVisivelClienteTrueOrderByCriadoEmDesc(patrocinadorId);
        return lista.stream().map(ContratoRes::of).toList();
    }

    @Transactional
    public ContratoRes atualizar(Long id, ContratoPatch patch) {
        ContratoGerado c = contrato(id);
        boolean publicando = patch.visivelCliente() != null && patch.visivelCliente() && !c.isVisivelCliente();
        if (patch.status() != null) {
            c.setStatus(patch.status());
            historico.registrar(c.getPatrocinador(), "STATUS_CONTRATO", c.getTitulo() + " → " + patch.status().getLabel());
        }
        if (patch.visivelCliente() != null) {
            c.setVisivelCliente(patch.visivelCliente());
        }
        if (publicando) {
            historico.registrar(c.getPatrocinador(), "PUBLICOU_CONTRATO", c.getTitulo());
            alertas.notificarComEmail(c.getPatrocinador(), TipoAlerta.CONTRATO, "Contrato disponível para revisão",
                    "A RBS disponibilizou \"" + c.getTitulo() + "\" na aba Contrato do portal.");
        }
        return ContratoRes.of(c);
    }

    @Transactional
    public void remover(Long id) {
        ContratoGerado c = contrato(id);
        if (c.getStatus() != StatusContrato.MINUTA || c.isVisivelCliente()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Só é possível excluir minutas não publicadas. Use o status Cancelado.");
        }
        contratos.delete(c);
        historico.registrar(c.getPatrocinador(), "REMOVEU_CONTRATO", c.getTitulo());
    }

    private ContratoGerado contrato(Long id) {
        ContratoGerado c = contratos.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contrato não encontrado"));
        acesso.exigirRbs();
        acesso.acessarAba(c.getPatrocinador().getId(), Aba.CONTRATO);
        return c;
    }

    private ModeloContrato modeloUsavel(Patrocinador p, Long modeloId) {
        ModeloContrato m = modelo(modeloId);
        if (!m.isAtivo()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Este modelo está arquivado");
        }
        if (m.getCota() != null && m.getCota() != p.getCota()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Este modelo é para outra cota");
        }
        return m;
    }

    /** Valores digitados à mão têm prioridade sobre os automáticos. */
    private static void aplicarManuais(Map<String, String> auto, Map<String, String> manuais) {
        if (manuais == null) {
            return;
        }
        manuais.forEach((k, v) -> {
            if (k != null && k.matches("[A-Za-z0-9_.]{1,100}") && v != null && !v.isBlank()) {
                auto.put(k, v);
            }
        });
    }
}
