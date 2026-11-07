package br.com.rbs.portal.web;

import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.config.PortalProps;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Metadados para o front montar menus/uploads sem duplicar regras. */
@RestController
@RequestMapping("/api/meta")
@RequiredArgsConstructor
public class MetaController {

    private final PortalProps props;

    @Value("${portal.open-staff-url}")
    private String openStaffUrl;

    @GetMapping
    public Map<String, Object> meta() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("abas", Arrays.stream(Aba.values()).map(a -> Map.of("key", a.name(), "label", a.getLabel())).toList());
        m.put("categorias", Arrays.stream(Categoria.values()).map(c -> Map.of(
                "key", c.name(), "aba", c.getAba().name(), "label", c.getLabel(),
                "patrocinadorPode", c.isPatrocinadorPode())).toList());
        m.put("cotas", Arrays.stream(Cota.values()).map(c -> Map.of("key", c.name(), "label", c.getLabel())).toList());
        m.put("setores", List.of(Setor.values()));
        m.put("tiposCortesia", List.of(TipoCortesia.values()));
        m.put("openStaffUrl", openStaffUrl);
        m.put("evento", Map.of("nome", props.eventoNome(), "data", props.eventoData().toString()));
        return m;
    }
}
