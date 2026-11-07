package br.com.rbs.portal.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController @RequestMapping("/api/public/pesquisa")
public class PublicSurveyController {
    private final br.com.rbs.portal.repository.PortalStateRepository repository;
    private final ObjectMapper mapper;
    public PublicSurveyController(br.com.rbs.portal.repository.PortalStateRepository repository,ObjectMapper mapper){this.repository=repository;this.mapper=mapper;}
    @GetMapping public Map<String,Object> config(@RequestParam("e") String eventId,@RequestParam("m") String sponsorId){
        return Map.of("brand",sponsorId,"event",eventId,"questions",new String[]{"atendimento","organizacao","espaco"});
    }
    @PostMapping @Transactional public Map<String,Boolean> submit(@RequestBody ObjectNode body) throws Exception {
        var state=repository.findById("rbs").orElseGet(br.com.rbs.portal.domain.PortalState::new);
        ObjectNode data=state.getJson()==null?mapper.createObjectNode():(ObjectNode)mapper.readTree(state.getJson());
        ArrayNode answers=data.withArray("surveyAnswers");
        ObjectNode answer=mapper.createObjectNode();
        answer.put("id",UUID.randomUUID().toString());answer.put("at",Instant.now().toString());
        answer.put("eventId",body.path("eventId").asText());answer.put("sponsorId",body.path("sponsorId").asText());
        answer.set("scores",body.path("scores").deepCopy());answer.put("comment",body.path("comment").asText());
        double sum=0;int count=0;
        for(var v:body.path("scores")){if(v.isNumber()){sum+=v.asDouble();count++;}}
        answer.put("rating",count==0?0:sum/count);answers.add(answer);
        state.setId("rbs");state.setJson(data.toString());repository.save(state);
        return Map.of("registrada",true);
    }
}
