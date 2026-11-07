package br.com.rbs.portal.service;

import br.com.rbs.portal.domain.Historico;
import br.com.rbs.portal.domain.Patrocinador;
import br.com.rbs.portal.repository.HistoricoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HistoricoService {

    private final HistoricoRepository repo;
    private final AcessoService acesso;

    public void registrar(Patrocinador p, String acao, String detalhe) {
        Historico h = new Historico();
        h.setPatrocinador(p);
        h.setUsuario(acesso.atual().getEmail());
        h.setAcao(acao);
        h.setDetalhe(detalhe != null && detalhe.length() > 1000 ? detalhe.substring(0, 1000) : detalhe);
        repo.save(h);
    }
}
