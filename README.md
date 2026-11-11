# Portal do Patrocinador

Portal web para gestão de patrocinadores do **Planeta Atlântida 2027**, desenvolvido pela **Chameleon Tech**. Reúne o frontend original (React) e um backend Spring Boot com autenticação JWT.

## Sumário

- [Visão geral](#visão-geral)
- [Requisitos](#requisitos)
- [Início rápido](#início-rápido)
- [Acesso de demonstração](#acesso-de-demonstração)
- [Configuração](#configuração)
- [API](#api)
- [Funcionalidades](#funcionalidades)
- [Dados de demonstração](#dados-de-demonstração)
- [Testes e verificações](#testes-e-verificações)
- [Segurança](#segurança)
- [Limitações conhecidas](#limitações-conhecidas)
- [Histórico de alterações](#histórico-de-alterações)

---

## Visão geral

| Camada | Pasta | Tecnologias |
|---|---|---|
| Frontend | `frontend/` | React, Vite, TypeScript (componentes e estilos preservados do ZIP recebido) |
| Backend | `backend/` | Spring Boot, Spring Security (JWT), H2 persistente em arquivo (ou PostgreSQL com o profile `postgres`) |

## Requisitos

- **VS Code** com as extensões *Extension Pack for Java* e *Spring Boot Extension Pack*
- **JDK 21**
- **Maven 3.9+** (ou Maven Wrapper, se disponível)
- **Node.js 22+** e npm
- **Windows PowerShell**

## Início rápido

### 1. Abrir o projeto

Extraia o ZIP e abra a pasta `portal-integrado-final` no VS Code (*Arquivo > Abrir Pasta*). Abra **dois terminais** (*Terminal > Novo Terminal*).

### 2. Backend (terminal 1)

```powershell
cd backend
java -version
mvn -version
mvn spring-boot:run
```

- API disponível em **http://localhost:8080**.
- O banco H2 é criado automaticamente em `backend/data/`.
- Se `mvn` não for reconhecido, instale o Maven e inclua a pasta `bin` no `PATH`. Se houver `mvnw.cmd`, use `./mvnw.cmd spring-boot:run`.

### 3. Frontend (terminal 2)

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

- Abra **http://localhost:8081**.
- O frontend chama a API em `http://localhost:8080` por meio da variável `VITE_API_URL`.

### 4. Primeiro acesso

Entre primeiro com o **administrador RBS** (veja [Acesso de demonstração](#acesso-de-demonstração)) para inicializar o estado de demonstração no H2. Depois, saia e experimente os logins das marcas.

## Acesso de demonstração

Com `SEED_DEMO=true` (padrão), o backend cria as contas abaixo se ainda não existirem. **Senhas de contas já existentes não são alteradas.**

| Perfil | E-mail | Senha inicial |
|---|---|---|
| RBS (administrador) | `admin@rbs.com.br` | `Admin@1234` |
| Solar Bebidas | `patrocinador@solar.com.br` | `Solar@1234` |
| Banco do Sul | `felipe@bancodosul.com.br` | `Banco@1234` |
| Nativa Telecom | `camila@nativatelecom.com.br` | `Nativa@1234` |
| Cooperativa Horizonte | `eduardo@horizonte.coop.br` | `Cooper@1234` |
| Universo Tech | `renata@universotech.com.br` | `Universo@1234` |

> ⚠️ Não utilize contas de demonstração em produção. Veja [Segurança](#segurança).

## Configuração

### Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `VITE_API_URL` | Frontend (`.env`) | URL base da API (padrão local: `http://localhost:8080`) |
| `SEED_DEMO` | Backend | Cria as contas de demonstração no primeiro início (padrão: `true`) |
| `JWT_SECRET` | Backend | Segredo do JWT; use um valor seguro com **32+ caracteres** em produção |
| `CORS_ORIGINS` | Backend | Origens permitidas, separadas por vírgula |
| `SPRING_PROFILES_ACTIVE` | Backend | Use `postgres` para trocar o H2 pelo PostgreSQL |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Backend | Conexão com o PostgreSQL (profile `postgres`) |

### Banco de dados

O backend usa **H2 em arquivo** por padrão. Para usar PostgreSQL, defina `DB_URL`, `DB_USER` e `DB_PASSWORD` no terminal e inicie com:

```powershell
$env:SPRING_PROFILES_ACTIVE='postgres'
mvn spring-boot:run
```

> Não remova a pasta `backend/data` se quiser preservar os dados. Não há integração com MongoDB nesta versão.

### CORS

Por padrão, o backend libera `http://localhost:5173`, `http://localhost:8081` e `http://localhost:8443`. Para outros endereços, defina `CORS_ORIGINS` com as origens separadas por vírgula.

## API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Sessão atual |
| `GET` / `PUT` | `/api/portal-state` | Estado do portal, persistido no H2 e separado entre administrador RBS e patrocinadores |
| `DELETE` | `/api/portal-state/survey` | Exclusão de respostas da pesquisa |
| `GET` / `POST` | `/api/public/pesquisa` | Pesquisa pública |
| `POST` | `/api/portal-access/usuarios` | Cria ou atualiza usuário de marca (restrito à RBS) |
| `POST` | `/api/patrocinadores/{pid}/arquivos` | Envio de arquivos do patrocinador (inclui a categoria `CONTRATO_ASSINADO`) |

As rotas de negócio já existentes no backend continuam disponíveis.

## Funcionalidades

### Liberação de acesso das marcas

O formulário **Liberar e-mail de acesso** cria ou atualiza o usuário no backend Spring Security (`POST /api/portal-access/usuarios`, restrito à RBS).

- O patrocinador é vinculado ao identificador da marca do frontend, e o login devolve esse vínculo.
- As senhas são armazenadas com **BCrypt**.
- Uma marca não acessa endpoints exclusivos da RBS; nesses casos, o **403** é a resposta correta.

### Contrato enviado pela marca

Na conta da marca: **Contrato > Enviar contrato PDF**. É possível substituir, visualizar e remover o PDF enviado.

- O arquivo integra o estado do portal salvo no H2 (`/api/portal-state`).
- Limite atual no frontend: **750 KB**.
- O backend permite a categoria `CONTRATO_ASSINADO` para usuários autorizados da marca.

> ⚠️ O estado da marca é separado do estado da RBS, então arquivos enviados por esta interface **não aparecem automaticamente na conta RBS**. Não use o envio como prova de recebimento pela RBS até a interface ser integrada ao endpoint de arquivos do backend e ao identificador numérico do patrocinador.

### Relatórios

Na conta RBS, aba **Relatório**:

- **Salvar relatório geral** e **Salvar geral por tipo de entrega** gravam uma cópia CSV dos dados do momento no estado do portal (H2), que pode ser baixada ou excluída.
- O consolidado por tipo de entrega considera entregas com status **Concluído**, agrupadas por categoria, com totais e quantidade de marcas.

### Exportação Excel (.xlsx)

Os botões de download geram arquivos `.xlsx` reais para: relatórios gerais, entregas por tipo, Instagram, mídias e pesquisa de satisfação.

- Relatórios salvos anteriormente (inclusive os exemplos em CSV) continuam no formato interno; o botão **Baixar Excel** converte o conteúdo no momento do download.
- Os arquivos têm cabeçalhos destacados, filtros e largura de coluna ajustada.
- Não é preciso instalar bibliotecas adicionais.

### Identidade visual Planeta Atlântida 2027

As imagens foram extraídas de `Visual_PA27_padrão.pdf` e ficam em `frontend/public/branding/`, sem depender de URLs externas.

| Arquivo | Uso |
|---|---|
| `logo-pa27.png` | Símbolo do Planeta Atlântida 2027 |
| `login-pa27.jpg` | Arte da página 5, exibida no login |
| `banner-pa27.jpg` | Arte da página 6, exibida no painel |
| `logo-hero-pa27.jpg` | Arte da página 7, para reutilização |
| `festival-pa27.jpg` | Arte da página 9, para reutilização |
| `perfil-rbs-pa27.png` | Avatar da equipe RBS (atualize o navegador com `Ctrl+Shift+R`) |

## Dados de demonstração

O frontend já contém eventos, marcas fictícias, entregas com diferentes status, solicitações de arquivos, cortesias, credenciamentos, métricas, resultados e mensagens de exemplo, além de dois relatórios CSV salvos no evento de 2025.

- Os dados são **fictícios** e não representam contratos reais nem arquivos enviados.
- Os dados existentes **não são apagados**. Se o portal já foi inicializado, o estado salvo prevalece sobre os exemplos novos.
- Para ver todos os dados de demonstração, use uma **instância H2 de teste separada**; nunca exclua o banco de produção.
- Persistência: os dados de cada marca ficam em áreas separadas. A primeira leitura herda o estado inicial da RBS, mas as atualizações seguintes **não** são sincronizadas entre as áreas (não é uma sincronização bidirecional).

## Testes e verificações

```powershell
# Backend
cd backend
mvn test

# Frontend
cd frontend
npm run build
```

Teste do preflight CORS (com o backend iniciado; o esperado é **HTTP 200**):

```powershell
curl.exe -i -X OPTIONS 'http://localhost:8080/api/auth/login' -H 'Origin: http://localhost:8081' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type'
```

## Segurança

Antes de disponibilizar o sistema publicamente:

- [ ] Definir `SEED_DEMO=false`
- [ ] Trocar as credenciais do administrador e de todas as contas padrão
- [ ] Definir um `JWT_SECRET` seguro (32+ caracteres)
- [ ] Configurar `CORS_ORIGINS` com os endereços reais
- [ ] Validar o isolamento entre RBS e marcas (o estado JSON não substitui regras de autorização específicas por operação)

## Limitações conhecidas

- Os arquivos `.asset.json` do frontend original são apenas **metadados**: as imagens JPG/PNG e o PDF que eles referenciam não vieram no ZIP. Para exibi-los, coloque os arquivos originais em `frontend/public/` e ajuste as referências no código.
- O estado JSON mantém a interface original, mas não substitui regras de autorização por operação de negócio.
- Arquivos enviados pela marca não chegam automaticamente à conta RBS (veja [Contrato enviado pela marca](#contrato-enviado-pela-marca)).
- Os dados das marcas e da RBS não são sincronizados entre si após a primeira leitura.
- O sistema **não foi validado em execução ponta a ponta** no ambiente de desenvolvimento, e as dependências npm não puderam ser instaladas offline. Execute `npm install && npm run build` no VS Code para validar a compilação.

## Histórico de alterações

### Correção de login das marcas (403)

Antes, o formulário **Liberar e-mail de acesso** apenas atualizava o estado visual e não criava uma conta autenticável. Agora ele cria ou atualiza o usuário real no backend.

**Para marcas cadastradas antes desta versão:** entre como administrador RBS, abra a marca e edite cada e-mail liberado, definindo uma nova senha de pelo menos 8 caracteres. Salve para sincronizar a conta no backend. Para marcas novas, use o formulário normalmente.

O frontend não preenche mais senhas de demonstração incorretas. A senha padrão RBS de desenvolvimento (`Admin@1234`) só vale se o seeder estiver habilitado e o banco estiver vazio.

### Novas funcionalidades

- Contratos enviados pela marca
- Relatórios gerais salvos
- Exportação Excel (`.xlsx`)
- Dados de demonstração
- Identidade visual Planeta Atlântida 2027