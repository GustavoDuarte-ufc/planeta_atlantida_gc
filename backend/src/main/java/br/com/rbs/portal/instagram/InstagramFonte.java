package br.com.rbs.portal.instagram;

import java.util.List;
import java.util.Map;

/** De onde vêm os dados do Instagram (hoje o MongoDB; trocável e fácil de simular em testes). */
public interface InstagramFonte {

    boolean configurado();

    /** Fotos diárias do perfil, mais recentes primeiro. */
    List<PerfilDia> perfis(String username, int max);

    /** Posts do perfil, mais recentes primeiro. */
    List<PostIg> posts(String username, int max);

    /** Lança exceção se o banco não responde. */
    void testar();

    /** Testa a conexão e lista bancos/coleções visíveis (só nomes). Nunca lança exceção. */
    default Map<String, Object> diagnosticar() {
        return Map.of("ok", false, "dica", "Diagnóstico não disponível.");
    }
}
