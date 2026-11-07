package br.com.rbs.portal.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

/** Configurações de negócio lidas do application.yml / variáveis de ambiente. */
@Component
public class PortalProps {

    @Value("${portal.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${portal.evento.nome:Planeta Atlântida}")
    private String eventoNome;

    /** AJUSTAR: data real do evento (AAAA-MM-DD). Os prazos padrão são calculados a partir dela. */
    @Value("${portal.evento.data:2027-01-29}")
    private String eventoData;

    @Value("${portal.empresa.nome:}")
    private String empresaNome;

    @Value("${portal.empresa.cnpj:}")
    private String empresaCnpj;

    @Value("${portal.mail.from:}")
    private String mailFrom;

    public String frontendUrl() {
        return frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
    }

    public String eventoNome() {
        return eventoNome;
    }

    public LocalDate eventoData() {
        try {
            return LocalDate.parse(eventoData.trim());
        } catch (DateTimeParseException e) {
            return LocalDate.now().plusDays(120);
        }
    }

    public String empresaNome() {
        return empresaNome;
    }

    public String empresaCnpj() {
        return empresaCnpj;
    }

    public String mailFrom() {
        return mailFrom;
    }
}
