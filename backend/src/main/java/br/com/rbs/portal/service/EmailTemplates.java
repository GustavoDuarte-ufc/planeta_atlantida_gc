package br.com.rbs.portal.service;

import org.springframework.web.util.HtmlUtils;

/** Layout simples e seguro (tudo escapado) dos e-mails do portal. */
public final class EmailTemplates {

    private EmailTemplates() {
    }

    public static String html(String titulo, String texto, String botaoLabel, String botaoUrl) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div style=\"font-family:Segoe UI,Arial,sans-serif;background:#f5f4fb;padding:24px\">");
        sb.append("<div style=\"max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;")
                .append("border:1px solid #e6e3f5\">");
        sb.append("<div style=\"background:#0A1440;color:#fff;border-bottom:4px solid #FFD000;padding:18px 24px;font-size:18px;font-weight:600\">")
                .append("Portal do Patrocinador</div>");
        sb.append("<div style=\"padding:24px;color:#1B1B1F;font-size:15px;line-height:1.55\">");
        sb.append("<h2 style=\"margin:0 0 12px;font-size:18px\">").append(HtmlUtils.htmlEscape(titulo)).append("</h2>");
        sb.append("<p style=\"margin:0 0 18px;white-space:pre-line\">").append(HtmlUtils.htmlEscape(texto)).append("</p>");
        if (botaoUrl != null && !botaoUrl.isBlank()) {
            sb.append("<a href=\"").append(HtmlUtils.htmlEscape(botaoUrl))
                    .append("\" style=\"display:inline-block;background:#FFD000;color:#0A1440;font-weight:700;text-decoration:none;")
                    .append("padding:10px 18px;border-radius:10px;font-weight:600\">")
                    .append(HtmlUtils.htmlEscape(botaoLabel)).append("</a>");
        }
        sb.append("</div><div style=\"padding:14px 24px;font-size:12px;color:#7a7890;border-top:1px solid #eee\">")
                .append("Mensagem automática do Portal do Patrocinador.</div></div></div>");
        return sb.toString();
    }
}
