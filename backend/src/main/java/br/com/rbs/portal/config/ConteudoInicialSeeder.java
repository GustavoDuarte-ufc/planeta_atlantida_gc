package br.com.rbs.portal.config;

import br.com.rbs.portal.domain.*;
import br.com.rbs.portal.repository.*;
import br.com.rbs.portal.service.PrazoService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Conteúdo inicial editável pela RBS: modelo de contrato, FAQ e um documento de exemplo (só se estiverem vazios)
 * e prazos padrão para patrocinadores que ainda não os têm (serve também de migração de bancos antigos).
 */
@Component
@Order(2)
@RequiredArgsConstructor
public class ConteudoInicialSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ConteudoInicialSeeder.class);

    private final ModeloContratoRepository modelos;
    private final FaqItemRepository faq;
    private final ConhecimentoDocRepository docs;
    private final PatrocinadorRepository patrocinadores;
    private final PrazoService prazos;

    static final String MODELO = """
            CONTRATO DE PATROCÍNIO — {{evento.nome}} {{evento.ano}}

            [MODELO ILUSTRATIVO — o texto jurídico deve ser revisado e aprovado pelo jurídico da RBS antes do uso.]

            Pelo presente instrumento, de um lado {{empresa.nome}}, inscrita no CNPJ sob o nº {{empresa.cnpj}}, \
            doravante denominada ORGANIZADORA, e de outro {{patrocinador.nome}}, doravante denominada PATROCINADORA, \
            representada por {{signatario.nome}}, {{signatario.cargo}}, portador(a) do documento {{signatario.documento}}, \
            e-mail {{signatario.email}}, têm entre si justo e contratado o seguinte:

            CLÁUSULA 1 — DO OBJETO
            O presente contrato tem por objeto o patrocínio da PATROCINADORA ao evento {{evento.nome}}, a realizar-se \
            em {{evento.data}}, na categoria de cota {{patrocinador.cota}}, conforme o plano comercial acordado entre as partes.

            CLÁUSULA 2 — DAS CONTRAPARTIDAS
            A ORGANIZADORA disponibilizará à PATROCINADORA {{cortesias.total}} cortesias e {{credenciais.total}} credenciais \
            de acesso, na forma e nos setores definidos no plano comercial e no portal do patrocinador.

            CLÁUSULA 3 — DAS OBRIGAÇÕES DA PATROCINADORA
            A PATROCINADORA compromete-se a enviar, nos prazos informados no portal, os materiais necessários à \
            execução das contrapartidas (logo, manual de identidade visual, materiais de mídia e demais documentos).

            CLÁUSULA 4 — DO FORO
            As partes elegem o foro da comarca a ser definido pelo jurídico da ORGANIZADORA para dirimir quaisquer dúvidas.

            E, por estarem de acordo, firmam o presente instrumento em {{data.hoje_extenso}}.

            ______________________________          ______________________________
            {{empresa.nome}}                                  {{patrocinador.nome}}
            ORGANIZADORA                                         {{signatario.nome}}
            """;

    @Override
    public void run(String... args) {
        if (modelos.count() == 0) {
            ModeloContrato m = new ModeloContrato();
            m.setNome("Contrato de patrocínio — padrão");
            m.setDescricao("Modelo inicial ilustrativo. Edite o texto e as cláusulas com o jurídico da RBS.");
            m.setCorpo(MODELO);
            modelos.save(m);
            log.info("Modelo de contrato inicial criado (edite em Contratos > Modelos).");
        }
        if (faq.count() == 0) {
            item("Como funciona o portal?", "Portal",
                    "Cada patrocinador tem um espaço próprio, com as abas liberadas pela sua cota, onde envia documentos e "
                            + "acompanha as entregas. Você só vê as informações da sua marca.");
            item("Quem pode ver e enviar o quê?", "Portal",
                    "O Admin Patrocinador (cliente ou agência) envia materiais como MIV, logo, documento de compra de ingressos "
                            + "e materiais de mídia, define as perguntas da pesquisa e informa o signatário do contrato. A RBS envia "
                            + "plano comercial, relatórios, fotos de comprovação, resultados da pesquisa e o contrato assinado.");
            item("Por que algumas abas não aparecem para a minha marca?", "Cotas",
                    "As abas disponíveis dependem do nível de cota (Master, Subcota G ou Subcota). Em caso de dúvida sobre o que "
                            + "sua cota inclui, consulte o plano comercial ou a equipe da RBS.");
            item("Como funcionam os prazos e alertas?", "Prazos",
                    "A aba Calendário mostra todas as entregas e as datas limite. Quando você envia o que foi pedido, o prazo "
                            + "é marcado como entregue automaticamente. O portal avisa por notificação e e-mail quando faltam 7, 3 e 1 "
                            + "dia, no vencimento e semanalmente enquanto estiver atrasado.");
            item("Como adiciono o calendário de prazos ao Outlook ou Google Agenda?", "Prazos",
                    "No Calendário, use o botão Exportar (.ics) e importe o arquivo no seu aplicativo de agenda.");
            item("Como destino as minhas cortesias?", "Cortesias",
                    "Na aba Cortesias, informe quantas cortesias de cada setor e tipo você destinou e, se quiser, uma observação.");
            item("Quando acontece o credenciamento?", "Credenciamento",
                    "O credenciamento acontece em dezembro e é feito pelo sistema Open Staff. A aba Credenciamento mostra as "
                            + "quantidades por setor e o botão de acesso ao Open Staff.");
            item("Como funciona a pesquisa da ativação?", "Pesquisa",
                    "Você define até 3 perguntas personalizadas para a pesquisa do evento. Depois do evento, a RBS publica os "
                            + "resultados na mesma aba.");
            item("Como acompanho e assino o contrato?", "Contrato",
                    "Informe os dados do signatário na aba Contrato. A RBS gera o contrato a partir do modelo e o disponibiliza "
                            + "para sua revisão; o contrato final assinado fica arquivado na mesma aba.");
            item("Esqueci minha senha. E agora?", "Acesso",
                    "Na tela de entrada, clique em \"Esqueci minha senha\" e informe seu e-mail. Você receberá um link, válido por "
                            + "60 minutos, para criar uma nova senha.");
        }
        if (docs.count() == 0) {
            ConhecimentoDoc d = new ConhecimentoDoc();
            d.setTitulo("EXEMPLO — substitua pelo Manual de Operações real");
            d.setConteudo("""
                    Este é um documento de exemplo. Envie o manual de operações em PDF, na página Base de conhecimento, \
                    e o assistente passará a responder com base nele.

                    O assistente só responde com o que estiver no FAQ e nos documentos cadastrados. \
                    Quando não encontra a resposta, registra a pergunta para a RBS completar a base.""");
            docs.save(d);
        }
        int criados = 0;
        for (Patrocinador p : patrocinadores.findAll()) {
            criados += prazos.gerarPadrao(p);
        }
        if (criados > 0) {
            log.info("{} prazo(s) padrão criado(s) para patrocinadores existentes.", criados);
        }
    }

    private void item(String pergunta, String categoria, String resposta) {
        FaqItem f = new FaqItem();
        f.setPergunta(pergunta);
        f.setCategoria(categoria);
        f.setResposta(resposta);
        faq.save(f);
    }
}
