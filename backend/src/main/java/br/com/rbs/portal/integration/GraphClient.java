package br.com.rbs.portal.integration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Cliente mínimo do Microsoft Graph (Outlook e SharePoint) com credenciais de aplicativo (client credentials).
 * Desligado por padrão. Permissões de aplicativo necessárias no Azure AD: Mail.Send e Sites.ReadWrite.All
 * (ou Sites.Selected), com consentimento do administrador. NÃO foi testado contra um tenant real.
 */
@Component
public class GraphClient {

    private static final Logger log = LoggerFactory.getLogger(GraphClient.class);
    private static final String GRAPH = "https://graph.microsoft.com/v1.0";
    /** Limite do upload simples do Graph. Acima disso seria preciso upload em sessão. */
    public static final long LIMITE_UPLOAD = 4L * 1024 * 1024;

    @Value("${portal.graph.enabled:false}")
    private boolean enabled;
    @Value("${portal.graph.tenant-id:}")
    private String tenantId;
    @Value("${portal.graph.client-id:}")
    private String clientId;
    @Value("${portal.graph.client-secret:}")
    private String clientSecret;
    /** Caixa postal que envia os e-mails (UPN ou id), ex.: portal@empresa.com.br */
    @Value("${portal.graph.sender:}")
    private String sender;
    @Value("${portal.graph.sharepoint-site-id:}")
    private String siteId;
    @Value("${portal.graph.sharepoint-folder:Portal do Patrocinador}")
    private String pastaRaiz;

    private final RestClient http = RestClient.create();
    private String token;
    private Instant tokenExpira = Instant.EPOCH;

    public boolean habilitado() {
        return enabled && !tenantId.isBlank() && !clientId.isBlank() && !clientSecret.isBlank();
    }

    public boolean emailHabilitado() {
        return habilitado() && !sender.isBlank();
    }

    public boolean sharePointHabilitado() {
        return habilitado() && !siteId.isBlank();
    }

    private synchronized String token() {
        if (token != null && Instant.now().isBefore(tokenExpira.minusSeconds(60))) {
            return token;
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("scope", "https://graph.microsoft.com/.default");
        form.add("grant_type", "client_credentials");
        Map<String, Object> r = http.post()
                .uri("https://login.microsoftonline.com/" + tenantId + "/oauth2/v2.0/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {
                });
        if (r == null || r.get("access_token") == null) {
            throw new IllegalStateException("Graph não devolveu access_token");
        }
        token = String.valueOf(r.get("access_token"));
        long seg = r.get("expires_in") instanceof Number n ? n.longValue() : 3000;
        tokenExpira = Instant.now().plusSeconds(seg);
        return token;
    }

    public void enviarEmail(Collection<String> para, String assunto, String html) {
        List<Map<String, Object>> destinos = para.stream()
                .map(e -> Map.<String, Object>of("emailAddress", Map.of("address", e))).toList();
        Map<String, Object> msg = Map.of(
                "message", Map.of(
                        "subject", assunto,
                        "body", Map.of("contentType", "HTML", "content", html),
                        "toRecipients", destinos),
                "saveToSentItems", true);
        http.post()
                .uri(GRAPH + "/users/" + sender + "/sendMail")
                .header("Authorization", "Bearer " + token())
                .contentType(MediaType.APPLICATION_JSON)
                .body(msg)
                .retrieve()
                .toBodilessEntity();
    }

    /** Envia um arquivo (até 4 MB) para {pasta raiz}/{subpasta}/{nome} no SharePoint. */
    public void enviarArquivoSharePoint(String subpasta, String nome, Path arquivo) throws IOException {
        if (Files.size(arquivo) > LIMITE_UPLOAD) {
            log.warn("SharePoint: '{}' acima de 4 MB, não sincronizado (use upload em sessão)", nome);
            return;
        }
        String caminho = codificar(pastaRaiz) + "/" + codificar(subpasta) + "/" + codificar(nome);
        URI uri = URI.create(GRAPH + "/sites/" + siteId + "/drive/root:/" + caminho + ":/content");
        http.put()
                .uri(uri)
                .header("Authorization", "Bearer " + token())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(Files.readAllBytes(arquivo))
                .retrieve()
                .toBodilessEntity();
    }

    private static String codificar(String s) {
        String limpo = s.replaceAll("[\\\\/:*?\"<>|#%]", "-").trim();
        return URLEncoder.encode(limpo, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
