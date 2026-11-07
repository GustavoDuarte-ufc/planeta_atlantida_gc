package br.com.rbs.portal.instagram;

import br.com.rbs.portal.dto.InstagramDtos.InstagramRes;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class InstagramDesligadoTest {

    static class FonteQuebrada implements InstagramFonte {
        public boolean configurado() { return true; }
        public List<PerfilDia> perfis(String u, int m) { throw new IllegalStateException("fora do ar"); }
        public List<PostIg> posts(String u, int m) { throw new IllegalStateException("fora do ar"); }
        public void testar() { throw new IllegalStateException("fora do ar"); }
    }

    @Test
    void semMongoRetornaDesabilitado() {
        MongoInstagramFonte f = new MongoInstagramFonte(); // sem URI: campos nulos
        assertFalse(f.configurado());
        InstagramRes r = new InstagramService(f, 60, "planetaatlantida").evento();
        assertFalse(r.habilitado());
        assertNull(r.perfil());
    }

    @Test
    void falhaDoBancoViraErroAmigavelSemVazarDetalhes() {
        InstagramRes r = new InstagramService(new FonteQuebrada(), 60, "planetaatlantida").evento();
        assertTrue(r.habilitado());
        assertNotNull(r.erro());
        assertFalse(r.erro().contains("fora do ar"));
    }
}
