package br.com.rbs.portal.web;

import br.com.rbs.portal.service.AcessoService;
import br.com.rbs.portal.domain.PortalState;
import br.com.rbs.portal.repository.PortalStateRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.Map;

/** Persistência do estado do frontend original, sem alterar seu layout. */
@RestController
public class PortalStateController {
    private final PortalStateRepository repository;
    private final AcessoService acesso;
    private final ObjectMapper mapper;
    public PortalStateController(PortalStateRepository repository, AcessoService acesso, ObjectMapper mapper) {
        this.repository=repository; this.acesso=acesso; this.mapper=mapper;
    }
    private String scope() {
        var user=acesso.atual();
        return user.getPatrocinador()==null ? "rbs" : "patrocinador-"+user.getPatrocinador().getId();
    }
    private ObjectNode read(String id) {
        try {
            var state=repository.findById(id);
            return state.isPresent() ? (ObjectNode)mapper.readTree(state.get().getJson()) : mapper.createObjectNode();
        } catch(Exception ex) { throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,"Estado inválido",ex); }
    }
    private void write(String id,ObjectNode body) {
        PortalState state=repository.findById(id).orElseGet(PortalState::new);
        state.setId(id);state.setJson(body.toString());repository.save(state);
    }
    @GetMapping("/api/portal-state")
    public ObjectNode get() {
        String id = scope();
        ObjectNode state = read(id);
        // A primeira visita de uma marca recebe a estrutura criada pela RBS,
        // mas as alterações seguintes ficam isoladas na sua própria área.
        if (!"rbs".equals(id) && (!state.path("users").isArray() || state.path("users").isEmpty())) {
            state = read("rbs");
        }
        if (!"rbs".equals(id) && state.path("users").isArray()) {
            state.withArray("users").forEach(u -> {
                if (u instanceof ObjectNode obj) obj.remove("password");
            });
        }
        return state;
    }
    @PutMapping("/api/portal-state") @Transactional
    public Map<String,Object> put(@RequestBody ObjectNode body) {
        write(scope(),body);
        return Map.of("salvo",true,"atualizadoEm",Instant.now().toString());
    }
    @DeleteMapping("/api/portal-state/survey") @Transactional
    public Map<String,Boolean> clear(@RequestParam String eventId,@RequestParam String sponsorId) {
        ObjectNode body=read(scope());
        ArrayNode result=mapper.createArrayNode();
        if(body.path("surveyAnswers").isArray()) body.path("surveyAnswers").forEach(answer -> {
            if(!eventId.equals(answer.path("eventId").asText()) || !sponsorId.equals(answer.path("sponsorId").asText())) result.add(answer);
        });
        body.set("surveyAnswers",result);write(scope(),body);
        return Map.of("salvo",true);
    }
}
