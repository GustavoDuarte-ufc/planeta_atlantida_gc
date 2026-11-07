package br.com.rbs.portal.web;

import br.com.rbs.portal.config.PortalProps;
import br.com.rbs.portal.integration.GraphClient;
import br.com.rbs.portal.integration.IaClient;
import br.com.rbs.portal.instagram.InstagramFonte;
import br.com.rbs.portal.service.EmailService;
import br.com.rbs.portal.storage.ArmazenamentoArquivos;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/** Mostra à RBS o que está ligado (sem expor segredos). */
@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN_RBS')")
public class ConfigController {

    private final EmailService email;
    private final GraphClient graph;
    private final IaClient ia;
    private final PortalProps props;
    private final InstagramFonte instagram;
    private final ArmazenamentoArquivos armazenamento;
    private final br.com.rbs.portal.espelho.EspelhoMongo espelho;

    @Value("${portal.alertas.cron:0 0 8 * * *}")
    private String cron;

    @GetMapping("/status")
    public Map<String, Object> status() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("emailModo", email.modo());
        m.put("graphHabilitado", graph.habilitado());
        m.put("sharePointHabilitado", graph.sharePointHabilitado());
        m.put("iaHabilitada", ia.habilitado());
        m.put("iaModelo", ia.modelo());
        m.put("alertasCron", cron);
        m.put("armazenamento", armazenamento.descricao());
        m.put("espelho", espelho.descricao());
        m.put("instagramHabilitado", instagram.configurado());
        m.put("eventoNome", props.eventoNome());
        m.put("eventoData", props.eventoData().toString());
        m.put("empresaNomeConfigurado", !props.empresaNome().isBlank());
        m.put("empresaCnpjConfigurado", !props.empresaCnpj().isBlank());
        m.put("frontendUrl", props.frontendUrl());
        return m;
    }
}
