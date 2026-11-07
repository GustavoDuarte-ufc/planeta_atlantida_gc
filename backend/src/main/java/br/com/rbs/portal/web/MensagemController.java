package br.com.rbs.portal.web;

import br.com.rbs.portal.dto.MensagemDtos.ConversaRes;
import br.com.rbs.portal.dto.MensagemDtos.MensagemReq;
import br.com.rbs.portal.dto.MensagemDtos.MensagemRes;
import br.com.rbs.portal.service.AcessoService;
import br.com.rbs.portal.service.MensagemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class MensagemController {

    private final MensagemService service;
    private final AcessoService acesso;

    @GetMapping("/api/patrocinadores/{pid}/mensagens")
    public List<MensagemRes> conversa(@PathVariable Long pid) {
        return service.abrir(acesso.acessar(pid), acesso.atual());
    }

    @PostMapping("/api/patrocinadores/{pid}/mensagens")
    public void enviar(@PathVariable Long pid, @Valid @RequestBody MensagemReq req) {
        service.enviar(acesso.acessar(pid), acesso.atual(), req.assunto(), req.texto());
    }

    /** Número de mensagens que o usuário ainda não leu (para o selo do menu). */
    @GetMapping("/api/mensagens/nao-lidas")
    public Map<String, Long> naoLidas() {
        return Map.of("naoLidas", service.naoLidas(acesso.atual()));
    }

    @GetMapping("/api/mensagens/caixa")
    @PreAuthorize("hasRole('ADMIN_RBS')")
    public List<ConversaRes> caixa() {
        return service.caixa();
    }
}
