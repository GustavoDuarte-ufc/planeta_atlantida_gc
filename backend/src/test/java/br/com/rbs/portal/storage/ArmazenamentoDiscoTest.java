package br.com.rbs.portal.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class ArmazenamentoDiscoTest {

    @Test
    void gravaLeERemove(@TempDir Path tmp) throws Exception {
        ArmazenamentoDisco a = new ArmazenamentoDisco(tmp.toString());
        a.gravar(7L, "abc", new ByteArrayInputStream("olá".getBytes(StandardCharsets.UTF_8)), "text/plain");
        assertEquals("olá", new String(a.ler(7L, "abc").getInputStream().readAllBytes(), StandardCharsets.UTF_8));
        a.remover(7L, "abc");
        assertThrows(ResponseStatusException.class, () -> a.ler(7L, "abc"));
    }

    @Test
    void naoSaiDaPastaRaiz(@TempDir Path tmp) {
        ArmazenamentoDisco a = new ArmazenamentoDisco(tmp.toString());
        assertThrows(ResponseStatusException.class, () -> a.ler(7L, "../../segredo"));
    }
}
