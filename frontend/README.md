# Portal do Patrocinador — Planeta Atlântida

Portal integrado para gestão do relacionamento entre a equipe RBS e as marcas patrocinadoras do Planeta Atlântida. O sistema centraliza clientes, planos comerciais, aplicações de marca, entregas, mídia, cortesias, credenciamento, contratos, comunicação, indicadores e relatórios.

## Sumário

- [Tecnologias](#tecnologias)
- [Como executar](#como-executar)
- [Acessos de demonstração](#acessos-de-demonstração)
- [Perfis e permissões](#perfis-e-permissões)
- [Módulos do sistema](#módulos-do-sistema)
- [Principais regras de negócio](#principais-regras-de-negócio)
- [Persistência e backend](#persistência-e-backend)
- [Integrações](#integrações)
- [Arquivos e mídia](#arquivos-e-mídia)
- [Relatórios](#relatórios)
- [Histórico de atividades](#histórico-de-atividades)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Scripts](#scripts)
- [Limitações atuais](#limitações-atuais)

## Tecnologias

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4
- Recharts
- Radix UI
- QR Code React
- pnpm

## Como executar

### Requisitos

- Node.js conforme `.mise.toml`
- pnpm

### Instalação

```bash
pnpm install
```

### Desenvolvimento

```bash
pnpm dev
```

No ambiente Figma Make, o servidor de desenvolvimento já é iniciado automaticamente.

### Build de produção

```bash
pnpm build
```

### Visualização do build

```bash
pnpm preview
```

## Acessos de demonstração

Quando a API não está disponível, o frontend oferece autenticação local para os acessos abaixo:

### Administração RBS

- E-mail: `admin@rbs.com.br`
- Senha: `admin123`

### Patrocinador

- E-mail: `patrocinador@solar.com.br`
- Senha: `solar123`

> Os acessos locais são destinados exclusivamente à demonstração. Não devem ser usados como autenticação de produção.

## Perfis e permissões

### Administração RBS

Possui acesso à gestão completa do evento:

- criação e edição de eventos;
- cadastro de patrocinadores;
- liberação de usuários;
- planos comerciais por cota ou marca;
- configurações específicas por marca;
- solicitações, tarefas e entregas;
- cortesias e credenciamento;
- contratos;
- mídia veiculada;
- contatos da equipe;
- indicadores, relatórios e histórico.

### Patrocinador

Os usuários das marcas podem possuir os seguintes níveis:

| Nível | Permissões principais |
| --- | --- |
| Administrador da marca | Acesso completo à marca e gestão dos usuários |
| Marca e conteúdo | Aplicações de marca, mídia, arquivos e entregas |
| Cortesias e convidados | Gestão de cortesias |
| Credenciamento | Cadastro da equipe no Open Staff |
| Somente consulta | Dashboard, relatórios, contato e FAQ |

## Módulos do sistema

### Visão geral

Apresenta o progresso operacional do evento e das marcas, incluindo conclusão das etapas do portal.

### Evento e clientes

Área exclusiva da RBS para:

- criar e editar edições do evento;
- cadastrar e selecionar marcas;
- editar dados do cliente;
- gerenciar usuários da marca;
- enviar planos comerciais por cota;
- enviar planos comerciais exclusivos por marca;
- cadastrar implementações específicas por marca;
- disponibilizar a ficha padrão de compra de ingressos.

### Perfil do cliente

Contém:

- nome da empresa;
- cota de patrocínio;
- contato responsável;
- imagem de perfil;
- e-mails com acesso;
- plano comercial;
- ficha de compra;
- ficha de recebimento;
- implementações específicas.

### Aplicações de marca

Gerencia:

- MIV;
- logo;
- fotos da marca aplicada no evento.

As fotos publicadas podem ser utilizadas no relatório final da marca.

### Mídia e conteúdo

Organizada em três serviços:

- Mídia assinada;
- Mídia própria;
- Conteúdo de marca.

Permite:

- envio de materiais pela marca;
- publicação de textos e links;
- solicitação de arquivos pela RBS;
- criação de tarefas;
- acompanhamento por agenda;
- publicação de relatórios de mídia;
- destinação para toda uma cota ou para uma marca específica.

### Cortesias

A RBS pode cadastrar os setores de cada evento. Exemplos:

- Arena;
- Camarote;
- Lounge;
- Premium;
- Rooftop;
- Terraço.

Cada setor oferece:

- Passaporte — dois dias;
- Sexta;
- Sábado.

As quantidades podem ser configuradas:

- por cota;
- exclusivamente para uma marca.

Uma configuração exclusiva prevalece sobre a configuração da cota. A opção **Usar padrão da cota** remove a personalização.

O sistema impede:

- reduzir uma quantidade para menos do que o número já destinado;
- excluir um setor que possua cortesias destinadas.

### Credenciamento

As credenciais são configuradas por área e público. A RBS pode definir quantidades:

- por cota;
- exclusivamente para uma marca.

A configuração é usada para:

- limite do Open Staff;
- vagas disponíveis;
- cadastro de pessoas;
- conferência por marca;
- histórico de conferências;
- indicadores e relatórios.

### Pesquisa da ativação

Permite:

- personalizar perguntas;
- armazenar respostas;
- acompanhar notas e comentários;
- gerar indicadores de satisfação;
- exportar respostas no Relatório.

### Contrato

Os modelos de contrato são gerenciados por evento e cota. A marca informa os dados do signatário e acessa o documento correspondente.

### Dashboard

Exibe a visualização analítica da marca selecionada:

- métricas sociais;
- gráficos de evolução;
- engajamento;
- alcance;
- pesquisa de satisfação;
- resultados do evento.

### Relatório

Exibe somente entregas concluídas e permite baixar arquivos CSV compatíveis com Excel.

Os downloads disponíveis são:

- entregas por tipo;
- métricas do Instagram;
- mídias;
- pesquisa de satisfação.

A administração RBS também possui a tabela **Dados gerais do evento**, consolidada por marca.

### Contato

Cada marca possui um único chat geral com a equipe RBS. As mensagens não são separadas por funcionário.

Abaixo da conversa é exibida uma tabela com:

- nome do funcionário da RBS;
- responsabilidade;
- WhatsApp;
- e-mail;
- atalhos para WhatsApp e e-mail.

A RBS pode cadastrar, editar e remover contatos da equipe.

### Dúvidas frequentes

FAQ geral do portal, com:

- busca;
- categorias;
- conteúdo por cota;
- edição exclusiva pela RBS;
- referência ao Manual de Operações.

### Histórico

Área exclusiva da RBS com registros automáticos das alterações realizadas no portal.

## Principais regras de negócio

### Configuração geral e exclusiva

Diversos recursos seguem uma hierarquia de configuração:

1. configuração exclusiva da marca;
2. configuração da cota;
3. dados legados ou valores padrão.

Essa regra é usada em:

- planos comerciais;
- cortesias;
- credenciamento.

### Tarefas e solicitações

Tarefas e solicitações podem ser destinadas:

- a todas as marcas de uma cota;
- exclusivamente a uma marca.

Quando o destino é uma cota, o sistema cria uma cópia para cada marca. Cada cópia mantém seu próprio status e arquivo entregue.

### Relatório de entregas

O Relatório considera somente entregas com situação **Concluído**.

A tabela contém:

- data;
- mês;
- entrega realizada;
- tipo;
- marca;
- total concluído daquele tipo no mês.

## Persistência e backend

### API

A URL da API pode ser definida por:

```env
VITE_API_URL=http://localhost:8080
```

Quando a variável não é informada, o frontend usa `http://localhost:8080`.

Principais endpoints esperados:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/portal-state`
- `PUT /api/portal-state`
- `GET /api/public/pesquisa`
- `POST /api/public/pesquisa`

### Fallback local

Se a API não estiver disponível, os acessos de demonstração utilizam o navegador como armazenamento.

Principais chaves:

| Chave | Conteúdo |
| --- | --- |
| `planeta-portal-api-token` | Token da sessão |
| `planeta-portal-mvp-v1` | Estado geral do portal |
| `planeta-survey-v1` | Respostas locais da pesquisa |

> O `localStorage` não é apropriado para arquivos grandes, dados sensíveis ou uso multiusuário em produção.

## Integrações

### Instagram

A RBS pode informar o ID da conta comercial da marca no Dashboard.

Ao confirmar o campo:

1. o ID é salvo no perfil da marca;
2. a coleta dos últimos 30 dias é solicitada;
3. os registros são consolidados por data;
4. os gráficos e relatórios são atualizados.

A coleta real deve ser feita no servidor para que o token da Meta não seja exposto no navegador.

Métricas previstas:

- novos seguidores;
- postagens;
- curtidas;
- compartilhamentos;
- comentários;
- alcance.

### WhatsApp

Os links são gerados no formato:

```text
https://wa.me/NUMERO
```

O número deve conter DDD e, preferencialmente, código do país.

## Arquivos e mídia

No modo de demonstração:

- o limite padrão de upload é 750 KB;
- imagens JPG, PNG e WEBP podem ser redimensionadas;
- arquivos são armazenados como Data URL;
- o visualizador interno suporta imagens, PDF e conteúdo textual compatível.

Em produção, recomenda-se utilizar armazenamento dedicado, como S3 ou serviço equivalente.

## Relatórios

### Entregas por tipo

Exporta apenas entregas concluídas e inclui a soma mensal por categoria.

### Instagram

Exporta uma linha por data com todas as métricas disponíveis.

### Mídias

Exporta relatórios de mídia e links publicados pela RBS.

### Pesquisa de satisfação

Exporta notas, respostas e comentários.

### Dados gerais da RBS

Consolida uma linha por marca com:

- cota;
- entregas concluídas;
- mídias publicadas;
- métricas do Instagram;
- respostas e satisfação;
- cortesias destinadas;
- pessoas credenciadas.

## Histórico de atividades

As alterações realizadas por `App.update` são comparadas pelo módulo `src/lib/audit.ts`.

O histórico registra:

- data e hora;
- pessoa;
- e-mail;
- perfil;
- ação;
- área;
- item;
- marca;
- descrição.

O histórico é limitado aos 2.000 registros mais recentes e pode ser exportado em CSV.

## Estrutura do projeto

```text
.
├── public/
│   ├── favicon.svg
│   ├── pa27-logo.svg
│   └── robots.txt
├── src/
│   ├── assets/
│   │   └── *.asset.json
│   ├── components/
│   │   ├── portal/
│   │   │   └── PortalApp.tsx
│   │   └── ui/
│   │       └── button.tsx
│   ├── lib/
│   │   ├── audit.ts
│   │   ├── backend.ts
│   │   ├── contract.ts
│   │   ├── faq.ts
│   │   ├── instagram.functions.ts
│   │   ├── survey.ts
│   │   └── utils.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── vite.config.ts
```

### Arquivos principais

#### `src/components/portal/PortalApp.tsx`

Componente principal do portal. Contém:

- tipos do domínio;
- dados iniciais;
- migração do estado;
- regras de negócio;
- navegação;
- páginas;
- formulários;
- dashboards;
- relatórios.

#### `src/index.css`

Design system, tema, responsividade e estilos dos módulos do portal.

#### `src/lib/backend.ts`

Cliente da API, autenticação e fallback local de demonstração.

#### `src/lib/audit.ts`

Comparação de estado, criação do histórico e exportação CSV.

#### `src/lib/survey.ts`

Leitura, simulação e armazenamento das respostas da pesquisa.

#### `src/lib/contract.ts`

Campos, modelos e preenchimento dos contratos.

## Scripts

| Comando | Descrição |
| --- | --- |
| `pnpm dev` | Inicia o Vite em desenvolvimento |
| `pnpm build` | Gera o build de produção |
| `pnpm preview` | Visualiza o build localmente |
| `pnpm format` | Formata o código com oxfmt |

## Limitações atuais

- O modo local armazena o estado no navegador e não sincroniza entre dispositivos.
- Os uploads locais são limitados a 750 KB.
- A integração real com Instagram exige servidor e credenciais da Meta.
- O CSV é compatível com Excel, mas não utiliza o formato binário `.xlsx`.
- Os acessos de demonstração não substituem autenticação de produção.
- Tokens e segredos de integrações nunca devem ser armazenados no frontend.

## Recomendações para produção

Antes de disponibilizar o portal em produção:

1. conectar uma API autenticada;
2. utilizar banco de dados persistente;
3. armazenar arquivos em serviço dedicado;
4. configurar HTTPS;
5. implementar recuperação de senha;
6. revisar papéis e autorização no servidor;
7. configurar a integração do Instagram no backend;
8. validar a política de privacidade e tratamento de dados pessoais;
9. adicionar testes automatizados e monitoramento.
