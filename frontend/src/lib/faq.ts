/**
 * Dúvidas frequentes do Portal do Patrocinador.
 * As respostas iniciais vêm do Manual de Operações do Planeta Atlântida e dos planos comerciais
 * de cada cota; a equipe RBS pode editar, excluir e cadastrar novas perguntas no portal.
 */
export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
  /** Cotas que veem a pergunta. Vazio ou ausente = todas as cotas. */
  tiers?: string[] | undefined;
  source?: string | undefined;
  builtIn?: boolean | undefined;
  createdAt?: string | undefined;
  createdBy?: string | undefined;
  updatedAt?: string | undefined;
  updatedBy?: string | undefined;
};

export const FAQ_CATEGORIES = [
  "Uso do portal",
  "Cortesias e ingressos",
  "Credenciamento",
  "Montagem e desmontagem",
  "Dias de evento",
  "Documentos e prazos",
  "Segurança do trabalho",
  "Energia e geradores",
  "Marca, imagem e mídia",
  "Sustentabilidade",
  "Contatos",
];

const MANUAL = "Manual de Operações 2026";
const MASTER_PLAN = "Plano comercial Cota Master 2027";
const SUBCOTA_G_PLAN = "Plano comercial Subcota G 2027";
const SUBCOTA_PLAN = "Plano comercial Subcota 2027";
const PLANS = "Planos comerciais 2027";
const PORTAL = "Portal do Patrocinador";

type Seed = Omit<FaqItem, "id" | "builtIn">;
const items: Seed[] = [
  // Uso do portal
  { category: "Uso do portal", source: PORTAL, question: "Como envio um arquivo que a RBS pediu?", answer: "Abra Mídia e conteúdo. Você pode clicar no dia de entrega no calendário ou abrir Materiais do cliente no tipo de mídia do pedido (Assinada, Própria ou Conteúdo de marca).\nClique em Enviar arquivo e escolha o arquivo. Depois do envio, a RBS passa a ver o pedido como Entregue. Se precisar trocar o arquivo, use Substituir." },
  { category: "Uso do portal", source: PORTAL, question: "Como destino as cortesias da minha marca?", answer: "Abra Cortesia e Credenciamento. A RBS define a quantidade de cada setor e dia para a sua cota; você escolhe o setor, o dia e informa o nome e o e-mail de cada convidado.\nO portal mostra quantas cortesias ainda estão livres." },
  { category: "Uso do portal", source: PORTAL, question: "Como cadastro as pessoas que vão trabalhar no evento?", answer: "Abra Cortesia e Credenciamento. Quando a RBS abrir o cadastro, preencha nome, documento, área e público de cada pessoa.\nO portal respeita o limite de credenciais da sua cota e mostra quantas vagas restam em cada área." },
  { category: "Uso do portal", source: PORTAL, question: "Quem pode liberar novos e-mails de acesso ao portal?", answer: "Somente a equipe RBS, no Perfil do cliente. Se alguém da sua equipe precisar de acesso, peça pelo Contato informando nome e e-mail." },
  { category: "Uso do portal", source: PORTAL, question: "Onde vejo os resultados da minha marca?", answer: "No Dashboard. Ele reúne as entregas de mídia, cortesias, credenciais e as fotos da marca aplicada no evento. O relatório final cobre todo o evento e pode ser impresso ou salvo em PDF.\nA pesquisa da ativação e os insights do Instagram fazem parte apenas da cota Master." },
  { category: "Uso do portal", source: PORTAL, question: "Como falo com a equipe RBS?", answer: "Pelo item Contato, no menu. Escolha o assunto (Geral, Entregas, Cortesias ou Credenciamento) e envie a mensagem. Você recebe um aviso no sino quando a RBS responder." },

  // Cortesias
  { category: "Cortesias e ingressos", source: MASTER_PLAN, tiers: ["Master"], question: "Quantas cortesias a cota Master recebe?", answer: "Por dia de evento:\n- Arena: 25 ingressos, com acesso pelo Portão 6.\n- Camarote: 40 ingressos com shuttle. Acesso pela Arena (Portão 6) ou pelo Camarote (Portão 4); o shuttle sai pelo Portão 4.\n- Lounge: 10 ingressos com shuttle, para dirigentes da marca. Além do ingresso, o espaço exige abadá credenciado ou camiseta oficial do Planeta Lounge." },
  { category: "Cortesias e ingressos", source: PLANS, tiers: ["Subcota G", "Subcota"], question: "Quantas cortesias a minha cota recebe?", answer: "Por dia de evento:\n- Arena: 4 ingressos, com entrada pelo Portão 6.\n- Camarote: 2 ingressos com shuttle, com entrada pelo Portão 6 ou pelo Portão 4 (shuttle pelo Portão 4)." },
  { category: "Cortesias e ingressos", source: MASTER_PLAN, question: "Posso comprar ingressos adicionais com desconto?", answer: "Sim. Patrocinadores têm desconto na compra de ingressos, até a véspera do evento ou conforme disponibilidade. Cada CPF de colaborador da marca pode comprar até 4 ingressos com desconto.\nO documento para a compra com valor de patrocinador fica no Perfil do cliente." },
  { category: "Cortesias e ingressos", source: PLANS, question: "Influenciadores contratados pela marca precisam de ingresso?", answer: "Sim. Influenciadores contratados para ações próprias entram com ingresso próprio: uma das cortesias da sua cota ou um ingresso comprado." },
  { category: "Cortesias e ingressos", source: PLANS, question: "Os dirigentes da marca podem visitar o backstage?", answer: "Os principais dirigentes podem visitar o camarim de um artista, uma vez por dia de evento, em grupo de até 4 pessoas.\nÉ uma gentileza combinada com os empresários dos artistas, não um compromisso comercial; a visita pode mudar ou ser cancelada conforme o artista." },

  // Credenciamento
  { category: "Credenciamento", source: MASTER_PLAN, tiers: ["Master"], question: "Quantas credenciais de serviço a cota Master tem?", answer: "Por dia de evento:\n- Arena: 20 para a marca patrocinadora e 60 para a agência de ativação.\n- Camarote: 10 para a marca patrocinadora e 20 para a agência de ativação.\n- Sala de Imprensa: 2, somente para a marca patrocinadora (backstage restrito, permite equipamento de captação).\n- Sala de Conteúdo: 3 para a equipe de conteúdo (posições rotativas entre os cotistas).\nTodo o serviço de cada setor deve caber nesse volume." },
  { category: "Credenciamento", source: SUBCOTA_G_PLAN, tiers: ["Subcota G"], question: "Quantas credenciais de serviço a Subcota G tem?", answer: "5 credenciais de profissionais a serviço por dia, na Arena." },
  { category: "Credenciamento", source: SUBCOTA_PLAN, tiers: ["Subcota"], question: "Quantas credenciais de serviço a Subcota tem?", answer: "10 credenciais de profissionais a serviço por dia, na Arena." },
  { category: "Credenciamento", source: `${MANUAL} · itens 6 e 6.2`, question: "Quem cadastra os prestadores de serviço?", answer: "Cada agência de ativação cadastra todos os seus prestadores de serviço. A documentação de cada pessoa é entregue de forma digital e o credenciamento só é liberado depois da conferência.\nNos dias de evento, o patrocinador deve manter cópias físicas ou digitais da documentação de todos os empregados e prestadores." },
  { category: "Credenciamento", source: `${MANUAL} · itens 4 e 6`, question: "Até quando posso cadastrar a equipe?", answer: "Na edição 2026, o credenciamento geral abriu em 02/12/2025 e o sistema fechou automaticamente às 23h59 de 26/01/2026, sem reabertura.\nA RBS informa as datas de cada edição e abre o cadastro na aba Cortesia e Credenciamento." },
  { category: "Credenciamento", source: `${MANUAL} · item 5`, question: "Por onde entra a equipe credenciada?", answer: "Pelo Portão 2, o portão de serviço: Rua Adão Serra Mariano, esquina com a Av. Renato Sirotsky.\nA entrada só é liberada depois da conferência dos documentos e da integração com a Segurança do Trabalho, que dura cerca de 30 minutos. Pessoas credenciadas a serviço não podem consumir bebida alcoólica durante o evento." },
  { category: "Credenciamento", source: `${MANUAL} · item 7.3.1`, question: "Quais documentos cada trabalhador da montagem precisa apresentar?", answer: "Todos:\n- Documento de identidade\n- ASO (de acordo com a atividade)\n- NR-18 válida, assinada por profissional de Segurança do Trabalho\n- Ficha de EPI\n- Contrato de trabalho ou contrato social (se for sócio)\nConforme a função também: qualificação (eletricistas, hidráulicos, engenheiros, arquitetos), certificado de operador (munck, guindaste), NR-10 (elétrica), NR-11 (empilhadeira), NR-12 (serra, solda e ferramentas) e NR-35 (trabalho acima de 2 metros)." },
  { category: "Credenciamento", source: `${MANUAL} · item 7.3.2`, question: "Quais documentos a empresa contratada precisa enviar?", answer: "Além dos documentos de cada trabalhador:\n- PGR (Programa de Gerenciamento de Riscos) válido\n- PCMSO (Programa de Controle Médico de Saúde Ocupacional) válido\n- Guias de recolhimento da Previdência Social\n- Certidões de regularidade CND e CNDT\n- APR (Análise Preliminar de Riscos) para cada ponto de trabalho em altura, elétrica ou movimentação de carga" },

  // Montagem e desmontagem
  { category: "Montagem e desmontagem", source: `${PLANS} · Datas importantes`, question: "Quando começa a montagem das ativações?", answer: "No Planeta Atlântida 2027, a montagem das ativações começa em 11/01 na Arena e em 18/01 no Camarote. As subcotas podem ter outra data de início, a confirmar.\nNa edição 2026, os espaços tiveram de ser entregues prontos até as 18h do dia anterior à vistoria dos Bombeiros, e nenhuma montagem é permitida durante o evento." },
  { category: "Montagem e desmontagem", source: `${MANUAL} · item 4.1`, question: "Qual é o horário de trabalho na montagem e na desmontagem?", answer: "- Expediente: 8h às 12h e 13h às 20h\n- Entrada de veículos: 8h30 às 11h30 e 14h às 19h\n- Carga e descarga: somente com agendamento prévio\nFora desses horários o acesso não é permitido, exceto nas extensões noturnas definidas pela equipe do Planeta. Pela lei municipal de Xangri-Lá, máquinas ruidosas não podem funcionar antes das 7h, depois das 18h, aos domingos e feriados." },
  { category: "Montagem e desmontagem", source: `${MANUAL} · item 5.3`, question: "Como agendo a entrada de materiais?", answer: "Preencha o Formulário Padrão para Entrada de Materiais (Anexo 3), pelo WhatsApp 54 99630-7058, com pelo menos 12 horas de antecedência. Informe a empresa, a placa do veículo e a lista de funcionários.\nA descarga é feita nos bolsões de carga e descarga e, depois dela, o veículo deve sair do local. Veículos particulares não entram; veículos de carga precisam de credencial veicular visível no painel." },
  { category: "Montagem e desmontagem", source: `${MANUAL} · item 5.4`, question: "Posso usar empilhadeira, PTA ou guindaste?", answer: "Sim, desde que a entrada desses equipamentos esteja no cronograma de montagem validado com a produção. É obrigatório apresentar plano de elevação de cargas e ART (Anexo 1, item 19), e o posicionamento do guindaste deve ser analisado antes com as equipes de atendimento, engenharia e operações." },
  { category: "Montagem e desmontagem", source: `${MANUAL} · item 4.1`, question: "Quando os patrocinadores desmontam os espaços?", answer: "Na edição 2026, a desmontagem dos patrocinadores começou na segunda-feira seguinte ao evento (02/02/2026), a partir das 8h, e o período de desmontagem foi até 15/02/2026. No domingo logo após o último show, a desmontagem é exclusiva das equipes do evento." },
  { category: "Montagem e desmontagem", source: MANUAL, question: "A equipe pode fazer refeições dentro do parque?", answer: "Durante a montagem e a desmontagem é proibido preparar, aquecer ou comer refeições dentro do Parque do Planeta. Nos dias de teste e de evento, use equipamento elétrico para aquecer alimentos." },

  // Dias de evento
  { category: "Dias de evento", source: `${MANUAL} · item 8.7`, question: "Qual é o horário de funcionamento dos estandes?", answer: "Da abertura dos portões, às 16h, até o fim do evento, por volta das 4h, nos dois dias. Os shows começam às 17h. No encerramento, cada patrocinador fecha o próprio espaço." },
  { category: "Dias de evento", source: `${MANUAL} · itens 8.9 e 8.11`, question: "Quando posso abastecer, fazer manutenção e limpar o estande?", answer: "Nos dias de show, somente das 7h às 12h. Depois disso, abastecimento e manutenção são proibidos; das 12h às 13h acontece a varredura pré-evento.\nA limpeza do estande é responsabilidade do patrocinador, inclusive na montagem e na desmontagem." },
  { category: "Dias de evento", source: `${MANUAL} · item 8.8`, question: "Posso ter DJ ou música no meu espaço?", answer: "Som na área externa dos estandes da Via Planeta é permitido para uma única marca, escolhida pela ordem de comercialização das cotas Master.\nNo Camarote, atrações musicais precisam de avaliação prévia da produção e só acontecem nos intervalos entre shows. A produção pode intervir se o som atrapalhar os palcos ou outros patrocinadores." },
  { category: "Dias de evento", source: `${MANUAL} · itens 8 e 8.3`, question: "Posso distribuir brindes e amostras?", answer: "Sim, com aprovação prévia da produção, que também avalia as quantidades. A distribuição só pode acontecer dentro do espaço do patrocinador; não é permitido formar paredão de promotores na entrada. Para fila ou ação itinerante, consulte a cota de sampling.\nEm sampling de bebidas: nada de vidro ou lata, apenas copos plásticos reutilizáveis, e nunca bebida alcoólica para menores de 18 anos." },
  { category: "Dias de evento", source: `${MANUAL} · item 8`, question: "Posso vender alimentos ou bebidas no estande?", answer: "Não. A comercialização de alimentos ou bebidas nos estandes de patrocinadores não é permitida." },
  { category: "Dias de evento", source: `${MANUAL} · itens 8.5 e 8.6`, tiers: ["Master"], question: "Como funcionam a ação de telão e o tour de convidados?", answer: "- Telão: cada patrocinador Master pode fazer uma ação no telão do Palco Planeta, de até 1 minuto, com o roteiro aprovado junto com o projeto.\n- Tour: uma vez por noite, até 10 convidados escolhidos por mecânicas na ativação assistem a 3 músicas na área em frente ao Palco Planeta e depois acessam o camarote geral." },
  { category: "Dias de evento", source: `${MANUAL} · item 8.10`, question: "Que segurança posso contratar para o meu espaço?", answer: "Somente empresas aprovadas pelo festival, com autorização de funcionamento e cadastro regular na Polícia Federal. Os agentes precisam de certificado do curso para grandes eventos, apresentado no posto da Polícia Federal no Portão 2, e devem ser identificados já no credenciamento.\nA documentação da empresa deve ser apresentada 30 dias antes do evento. Na montagem e na desmontagem, a segurança do estande é responsabilidade exclusiva do patrocinador." },

  // Documentos e prazos
  { category: "Documentos e prazos", source: `${PLANS} · Datas importantes`, question: "Até quando envio o projeto da ativação?", answer: "No Planeta Atlântida 2027, a data final de envio dos projetos de ativação é 16/12, para os espaços com metragem própria na Arena, no Camarote e no Premium." },
  { category: "Documentos e prazos", source: `${MANUAL} · item 8.1.1`, question: "O que o projeto executivo do espaço deve ter?", answer: "- Plantas baixas\n- Laudos técnicos\n- Cálculo estrutural\n- Projeto elétrico\n- Cálculos de vento" },
  { category: "Documentos e prazos", source: `${MANUAL} · item 8.1.2`, question: "Quais documentos liberam o estande?", answer: "- ART/RRT dos profissionais de cada área, registrados no CREA/CAU do Rio Grande do Sul\n- Laudos para o Corpo de Bombeiros: elétrico (M1), segurança das estruturas (M2), CMAR (M3) e dos equipamentos\n- Plano de Gestão de Resíduos e Ações de Sustentabilidade\n- Plano Operacional da Ativação e Consumo Elétrico\n- Contrato com empresa de vigilância regularizada na Polícia Federal\n- Alvará e atestado médico de quem trabalha com alimentos\n- Planilha do ECAD\nAs vias originais, assinadas por contratante e contratado e com boleto e comprovante de pagamento, são entregues no Grupo RBS: Av. Érico Veríssimo, 400, 4º andar, aos cuidados de Adriano Barboza ou Jaciane Martins." },
  { category: "Documentos e prazos", source: `${MANUAL} · item 8.2`, question: "Qual seguro preciso contratar?", answer: "- RC Eventos: R$ 4.000.000, com coberturas de RC Empregador, Tumultos, Alimentos e Bebidas, Instalação e Montagem, Cruzada, Erro de Projetos, Imóveis, Produtos, Parque de Diversões, Fogos (se houver) e Danos Morais\n- RC Equipamentos: R$ 400.000, para estruturas temporárias, equipamentos, objetos cenográficos e decoração\n- Acidentes Pessoais Coletivos da equipe: R$ 100.000 por morte ou invalidez e R$ 10.000 de despesas médicas\nNa edição 2026, a apólice teve de ser enviada até 05/01/2026." },
  { category: "Documentos e prazos", source: `${MANUAL} · item 8`, question: "Até quando envio a planilha do ECAD?", answer: "Na edição 2026, a planilha do ECAD, com o setlist que será tocado no espaço, teve de ser enviada até 15/01/2026, no modelo do evento. Ajustes no setlist podiam ser comunicados até 05/02/2026.\nTaxas de alvarás e liberações exigidas pelos órgãos públicos são pagas pelo patrocinador." },
  { category: "Documentos e prazos", source: `${MANUAL} · item 3`, question: "Qual endereço uso em ART, RRT e contratos?", answer: "Av. Interbalneários, nº 413, Xangri-Lá / RS, CEP 95588-000.\nPara a montagem e a desmontagem, o acesso é pelo Portão 2: Rua Adão Serra Mariano, esquina com a Av. Renato Sirotsky." },

  // Segurança do trabalho
  { category: "Segurança do trabalho", source: `${MANUAL} · itens 5.2 e 7.1`, question: "Qual é o EPI mínimo para entrar na montagem?", answer: "- Capacete próprio (é proibido usar boné por baixo)\n- Camiseta de manga curta ou longa\n- Calça comprida\n- Sapato fechado\nConforme a atividade, também: abafador de ruído, óculos, luvas, cinto de trabalho em altura com mosquetão, máscara de solda e linha de vida. Os EPIs devem ter Certificado de Aprovação (CA) e estar em bom estado." },
  { category: "Segurança do trabalho", source: `${MANUAL} · item 7`, question: "Posso contratar menores de 18 anos?", answer: "Não. É proibida a contratação de menores de 18 anos para qualquer atividade no evento. Também é proibido portar armas dentro do parque, exceto nos casos previstos em lei." },
  { category: "Segurança do trabalho", source: `${MANUAL} · item 7.2`, question: "Quais formas de contratação são aceitas?", answer: "CLT (prazo indeterminado, determinado ou intermitente), segurança privada conforme a Lei 14.967/2024, trabalho temporário, contratos de músicos, artistas e técnicos de espetáculo, autônomos e MEI.\nEm qualquer forma de contratação, o recolhimento de impostos e encargos é obrigatório." },

  // Energia
  { category: "Energia e geradores", source: `${MANUAL} · item 11.2`, question: "Qual é o padrão de energia e de tomada?", answer: "Rede trifásica 380/220 V (3F + N + P, sistema de 5 fios), com tomada industrial padrão IEC de 5 pinos (3F + N + T). Quem não tiver o plugue pode alugar do evento, ao custo equivalente a 5 kVA por ponto.\nCada ativação da Arena e do Baixo Camarote recebe também um ponto de serviço 220 V 20 A, com tomada padrão brasileiro, para ferramentas, testes e iluminação." },
  { category: "Energia e geradores", source: `${MANUAL} · item 12.3`, question: "Quanto custa a energia fornecida pelo evento?", answer: "Na edição 2026, R$ 275,00 por kVA, calculado pela potência do projeto elétrico do estande, com medições feitas pela equipe do evento. Se for preciso mais potência que a disponível no ponto, o valor pode ser recalculado.\nPontos adicionais dependem de aprovação da engenharia e custam a carga nominal mais 5 kVA." },
  { category: "Energia e geradores", source: `${MANUAL} · itens 12.1 e 12.2 · ${PLANS}`, question: "Posso usar gerador próprio?", answer: "No Camarote, não: é obrigatório usar a energia fornecida pelo evento.\nNa Arena, é opcional, mas precisa ser informado até 30/11 e aprovado antes pela produção, com técnico próprio para operação e segurança e responsabilidade técnica assinada por engenheiro eletricista. O gerador fica no local definido pela organização." },

  // Marca, imagem e mídia
  { category: "Marca, imagem e mídia", source: MASTER_PLAN, question: "Qual a diferença entre mídia Assinada, Própria e Conteúdo de marca?", answer: "- Assinada: a marca aparece assinando as entregas do festival, como citações de 5\" na voz dos comunicadores e vinhetas.\n- Própria: espaço para a mídia da própria marca, como comerciais de 30\", merchandising, display e anúncios. A produção da mídia própria é responsabilidade do cliente ou da agência.\n- Conteúdo de marca: conteúdo personalizado, alinhado ao festival, como o Minuto no Break." },
  { category: "Marca, imagem e mídia", source: `${MANUAL} · item 8.4`, question: "Posso usar drone no evento?", answer: "Não. Nos dias de evento só é permitido o drone do fornecedor oficial, contratado pela área de atendimento ao patrocinador. Na montagem, para registro e timelapse, informe a produção e registre o aparelho na Área de Operações.\nO descumprimento gera multa de R$ 50.000, ou R$ 100.000 se houver dano a terceiros ou a pessoas." },
  { category: "Marca, imagem e mídia", source: `${MANUAL} · item 8.4`, question: "Posso publicar fotos da montagem?", answer: "Não. Imagens da estrutura do evento, como palcos, camarote e áreas exclusivas, não podem ser usadas em redes sociais ou divulgação durante a montagem e a desmontagem." },
  { category: "Marca, imagem e mídia", source: `${MANUAL} · item 8.4 · ${PLANS}`, question: "Posso usar a marca Planeta Atlântida?", answer: "Patrocinadores Master e cotas de ativação podem usar a marca do festival em publicidade. Todo uso deve seguir o Manual de Marca e ser aprovado pelo Marketing do Grupo RBS antes da veiculação." },
  { category: "Marca, imagem e mídia", source: PLANS, question: "Posso usar artistas do line-up em ações da marca?", answer: "Sim, com custo de 10% do cachê do artista junto ao evento, e a contratação é intermediada pela área de Produto B2B do Planeta Atlântida.\nNão é permitido entregar brindes, produtos ou presentes aos artistas, a não ser que a marca já tenha relação comercial com eles e tenha avisado antes." },
  { category: "Marca, imagem e mídia", source: PLANS, question: "A RBS cede fotos do evento para a marca?", answer: "A captação de imagens da ativação é responsabilidade da marca, usando as credenciais de serviço da cota. Ceder fotos do arquivo do festival é uma gentileza: peça com pelo menos 5 dias de antecedência. São fotos gerais do evento, sem briefing da marca." },

  // Sustentabilidade
  { category: "Sustentabilidade", source: `${MANUAL} · itens 14.2 e 14.3`, question: "Como devo descartar os resíduos do meu espaço?", answer: "Separe os resíduos conforme a classificação do evento e descarte apenas nos coletores e caçambas identificados da SABA. Contrate empresas licenciadas para transporte e destinação.\nEnvie os comprovantes (MTR, notas fiscais e certificados de destinação), além de comprovantes de doação ou reciclagem, para sustentabilidade@planetaatlantida.com.br." },
  { category: "Sustentabilidade", source: `${MANUAL} · itens 8.3 e 14.2`, question: "Quais materiais devo evitar na ativação?", answer: "- Descartáveis e itens de uso único (copos, garrafas, sacolas)\n- Brindes de PVC ou EVA sem plano de reaproveitamento\n- Isopor (EPS), gesso e papéis plastificados ou metalizados\nVidros e espelhos só no Baixo Camarote, com aprovação prévia; prefira acrílico, ACM ou espelho autoadesivo. Banners e lonas podem ser doados a ONGs, escolas ou cooperativas." },

  // Contatos
  { category: "Contatos", source: `${MANUAL} · item 2.2`, question: "Com quem falo sobre cada assunto no evento?", answer: "- Atendimento aos patrocinadores: Adriano Barboza, 51 98465-6868\n- Implantação e montagens: Eng. Régis Flores, 51 98561-6675\n- Elétrica: Eng. Lucas Endres, 51 99599-2051\n- Credenciamento: Tatiana Zandavalli, 54 99191-7001\n- Arena: Fiorella Agrifoglio, 51 98429-9902\n- Camarote e Premium: Doda Bedin, 51 98152-0254\n- Lounge: Juliana Baierle, 51 99917-0430\n- Planeta Open Bar: Luiz Costa, 51 99852-7106\n- Segurança do Trabalho: Robson Oliveira, 51 99163-5209\n- Meio ambiente e sustentabilidade: Carolina, 51 98402-8846\n- PPCI: Thiago Vianna, 51 99702-7887, ou Jéssica, 51 99142-2967" },
  { category: "Contatos", source: `${MANUAL} · item 2.1`, question: "Como relato uma irregularidade?", answer: "Pelo Canal de Ética do Grupo RBS: www.contatoseguro.com.br/gruporbs. Use o canal para qualquer situação contrária ao Código de Ética e Conduta, ao Manual de Operações ou à lei." },
];

export const DEFAULT_FAQ: FaqItem[] = items.map((item, index) => ({ ...item, id: `faq-${String(index + 1).padStart(2, "0")}`, builtIn: true }));

/** Uma marca só vê as perguntas sem cota definida ou marcadas para a cota dela. */
export const faqForTier = (list: FaqItem[], tier?: string) => list.filter((item) => !item.tiers?.length || (!!tier && item.tiers.includes(tier)));

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Busca sem diferenciar acentos e maiúsculas; todas as palavras digitadas precisam aparecer. */
export function searchFaq(list: FaqItem[], query: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  return list.filter((item) => {
    const haystack = normalize(`${item.question} ${item.answer} ${item.category}`);
    return words.every((word) => haystack.includes(word));
  });
}

/** Categorias na ordem padrão, seguidas das criadas pela RBS. */
export function faqCategories(list: FaqItem[]) {
  const used = new Set(list.map((item) => item.category));
  return [...FAQ_CATEGORIES.filter((c) => used.has(c)), ...[...used].filter((c) => !FAQ_CATEGORIES.includes(c)).sort((a, b) => a.localeCompare(b, "pt-BR"))];
}
