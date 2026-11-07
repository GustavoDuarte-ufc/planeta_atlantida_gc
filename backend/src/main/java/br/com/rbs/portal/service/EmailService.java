package br.com.rbs.portal.service;

import br.com.rbs.portal.config.PortalProps;
import br.com.rbs.portal.integration.GraphClient;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;

/**
 * Envio de e-mail com três modos, nesta ordem: Microsoft Graph (Outlook) → SMTP → simulado (apenas log).
 * O modo simulado deixa o desenvolvimento funcionar sem servidor de e-mail: o conteúdo (inclusive o link
 * de recuperação de senha) aparece no console do back-end. Falha de envio nunca derruba a operação.
 */
@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final GraphClient graph;
    private final ObjectProvider<JavaMailSender> smtp;
    private final PortalProps props;

    public String modo() {
        if (graph.emailHabilitado()) {
            return "GRAPH";
        }
        return smtp.getIfAvailable() != null ? "SMTP" : "SIMULADO";
    }

    public void enviar(Collection<String> para, String assunto, String titulo, String texto,
                       String botaoLabel, String botaoUrl) {
        List<String> destinos = para.stream().filter(e -> e != null && !e.isBlank()).distinct().toList();
        if (destinos.isEmpty()) {
            return;
        }
        String html = EmailTemplates.html(titulo, texto, botaoLabel, botaoUrl);
        try {
            switch (modo()) {
                case "GRAPH" -> graph.enviarEmail(destinos, assunto, html);
                case "SMTP" -> enviarSmtp(destinos, assunto, html);
                default -> log.info("[E-MAIL SIMULADO] Para: {} | Assunto: {} | {}{}", destinos, assunto, texto,
                        botaoUrl == null ? "" : " | Link: " + botaoUrl);
            }
        } catch (Exception e) {
            log.warn("Falha ao enviar e-mail '{}' para {}: {}", assunto, destinos, e.getMessage());
        }
    }

    private void enviarSmtp(List<String> destinos, String assunto, String html) throws Exception {
        JavaMailSender sender = smtp.getObject();
        MimeMessage msg = sender.createMimeMessage();
        MimeMessageHelper h = new MimeMessageHelper(msg, false, "UTF-8");
        if (!props.mailFrom().isBlank()) {
            h.setFrom(props.mailFrom());
        }
        h.setTo(destinos.toArray(new String[0]));
        h.setSubject(assunto);
        h.setText(html, true);
        sender.send(msg);
    }
}
