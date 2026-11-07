# Portal do Patrocinador — frontend original + backend Spring Boot
# Chameleon Tech

## Requisitos
- VS Code com extensões **Extension Pack for Java** e **Spring Boot Extension Pack**
- JDK 21, Maven 3.9+ (ou Maven Wrapper se disponível), Node.js 22+ e npm
- Windows PowerShell

## Estrutura
- `frontend/`: React + Vite + TypeScript, preservando os componentes e estilos do ZIP recebido.
- `backend/`: Spring Boot + Spring Security JWT + H2 persistente (ou PostgreSQL com profile `postgres`).

## 1. Abrir no VS Code
Extraia o ZIP e abra a pasta `portal-integrado-final` no VS Code (Arquivo > Abrir Pasta). Abra **dois terminais** (Terminal > Novo Terminal).

## 2. Backend (terminal 1)
```powershell
cd backend
java -version
mvn -version
mvn spring-boot:run
```
Se `mvn` não for reconhecido, instale Maven e inclua `bin` no PATH. Se houver `mvnw.cmd`, pode usar `./mvnw.cmd spring-boot:run`.
API: http://localhost:8080. O banco H2 é criado automaticamente em `backend/data/`.

## 3. Frontend (terminal 2)
```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```
Abra **http://localhost:8081**. O frontend chama a API em `http://localhost:8080` via `VITE_API_URL`.

## 4. Login de demonstração
Com `SEED_DEMO=true` (padrão), no primeiro início o backend cria o administrador:
- E-mail: `admin@rbs.com.br`
- Senha: `Admin@1234`
Troque as credenciais e defina `SEED_DEMO=false` antes de disponibilizar o sistema publicamente. Não utilize contas demo em produção.

## 5. Configurações e banco
O backend usa H2 em arquivo por padrão. Para PostgreSQL, configure `DB_URL`, `DB_USER`, `DB_PASSWORD` no terminal e inicie com:
```powershell
$env:SPRING_PROFILES_ACTIVE='postgres'
mvn spring-boot:run
```
Para CORS, o backend libera `http://localhost:5173`, `http://localhost:8081` e `http://localhost:8443` por padrão. Para outros endereços, configure `CORS_ORIGINS` com origens separadas por vírgula. Defina `JWT_SECRET` seguro (32+ caracteres) em produção.

## 6. Integração
- Login real: `POST /api/auth/login`; sessão: `GET /api/auth/me`.
- Estado do portal: `GET/PUT /api/portal-state`, persistido no H2; separado entre administrador RBS e patrocinadores.
- Pesquisa pública: `GET/POST /api/public/pesquisa`.
- Exclusão de respostas: `DELETE /api/portal-state/survey`.
- As rotas de negócio já existentes no backend continuam disponíveis.

## 7. Verificações
```powershell
# No backend
mvn test
# No frontend
npm run build
```
No PowerShell, teste o preflight CORS:
```powershell
curl.exe -i -X OPTIONS 'http://localhost:8080/api/auth/login' -H 'Origin: http://localhost:8081' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type'
```
O retorno esperado é HTTP 200, desde que o backend esteja iniciado.

## Limitações importantes
Os arquivos `.asset.json` do frontend original são apenas **metadados**: as imagens JPG/PNG e o PDF que eles referenciam não estavam presentes no ZIP recebido. Para exibir esses recursos, inclua os arquivos originais em `frontend/public/` e ajuste as referências no código. O estado JSON mantém a interface original, mas não substitui regras de autorização específicas para cada operação do negócio; valide o isolamento antes de produção. O sistema não foi validado em execução ponta a ponta neste ambiente.

## Correção de login das marcas (403)

O formulário **Liberar e-mail de acesso** agora cria ou atualiza também o usuário no
backend Spring Security (`POST /api/portal-access/usuarios`, restrito à RBS).
Anteriormente o formulário apenas atualizava o estado visual, portanto não criava
uma conta autenticável. O patrocinador é vinculado ao identificador da marca do
frontend, e o login devolve esse vínculo. Senhas são armazenadas com BCrypt.

**Para marcas cadastradas antes desta versão:** entre como administrador RBS,
abra a marca e edite cada e-mail liberado, definindo uma nova senha de pelo
menos oito caracteres. Salve para sincronizar a conta real no backend. Para
marcas novas, use o formulário normalmente. Uma marca não pode acessar endpoints
exclusivos da RBS; nesses casos 403 continua sendo a resposta correta.

O frontend não preenche mais senhas de demonstração incorretas. A senha padrão
RBS de desenvolvimento, se o seeder estiver habilitado e o banco estiver vazio,
é `Admin@1234`. Altere-a antes de publicar.

**Persistência:** esta versão mantém o banco H2 local e não adiciona nem ativa
nenhuma integração MongoDB. Os dados do portal por marca continuam em áreas
separadas; a primeira leitura herda o estado inicial da RBS, mas atualizações
posteriores não são sincronizadas automaticamente entre as áreas. Não considere
este fluxo uma sincronização bidirecional de dados entre marcas e RBS.

## Novas funcionalidades — contratos e relatórios salvos

### Contrato enviado pela marca
Na conta da marca, acesse **Contrato > Enviar contrato PDF**. É possível substituir, visualizar e remover o PDF enviado. O arquivo integra o estado do portal salvo no H2 pela rota `/api/portal-state`. O limite atual de arquivos no frontend é **750 KB**. O backend também passou a permitir a categoria `CONTRATO_ASSINADO` para usuários autorizados da marca em `POST /api/patrocinadores/{pid}/arquivos`.

**Atenção:** o estado do portal da marca é separado do estado da RBS nesta versão. Portanto, arquivos enviados por esta interface não são automaticamente exibidos na conta RBS. Para um fluxo de revisão centralizado, será necessária a integração da interface com o endpoint de arquivos do backend e com o identificador numérico do patrocinador. Não use o envio pela interface como prova de recebimento pela RBS até essa integração estar concluída.

### Relatórios gerais salvos
Na conta RBS, acesse **Relatório**. Há botões para **Salvar relatório geral** e **Salvar geral por tipo de entrega**. Cada operação grava uma cópia CSV dos dados daquele momento no estado do portal, persistido em H2, e permite baixar ou excluir a cópia salva. O consolidado por tipo de entrega considera entregas com status **Concluído**, agrupadas pela categoria, com totais e quantidade de marcas.

### Testes e limitações
Não foi possível instalar dependências npm offline neste ambiente; execute `npm install && npm run build` no seu VS Code para validar a compilação. O projeto mantém H2 e não requer configurar MongoDB. Não remova a pasta `backend/data` se quiser preservar os dados.


## Dados de demonstração (H2, sem MongoDB)

O frontend já contém eventos, marcas fictícias, entregas com diferentes status, solicitações de arquivos, cortesias, credenciamentos, métricas, resultados e mensagens de exemplo. Esta edição inclui também dois relatórios CSV salvos no evento de 2025. Os dados são **fictícios** e não representam contratos reais nem arquivos enviados.

Com `SEED_DEMO=true` (padrão), o backend cria, se ainda não existirem, as contas abaixo. **Não altera senhas de contas existentes**. O administrador precisa fazer login primeiro para inicializar o estado de demonstração no H2.

| Perfil | E-mail | Senha inicial |
|---|---|---|
| RBS | admin@rbs.com.br | Admin@1234 |
| Solar Bebidas | patrocinador@solar.com.br | Solar@1234 |
| Banco do Sul | felipe@bancodosul.com.br | Banco@1234 |
| Nativa Telecom | camila@nativatelecom.com.br | Nativa@1234 |
| Cooperativa Horizonte | eduardo@horizonte.coop.br | Cooper@1234 |
| Universo Tech | renata@universotech.com.br | Universo@1234 |

**Banco já utilizado:** os dados existentes não são apagados. Se o portal já foi inicializado anteriormente, o estado salvo prevalece sobre os exemplos novos. Para experimentar todos os dados de demonstração, utilize uma instância H2 de teste separada, nunca exclua o banco de produção.

**Execução no VS Code:** abra a pasta `backend` e execute `mvn spring-boot:run`; em outro terminal abra `frontend`, execute `npm install` e `npm run dev`. Entre primeiro com o administrador. Em seguida, saia e experimente os logins das marcas.

**Segurança:** use `SEED_DEMO=false` fora do ambiente de desenvolvimento e altere todas as senhas padrão.

## Exportação Excel (.xlsx)

Na aba **Relatório**, os botões de download agora geram arquivos Excel reais (`.xlsx`) para os relatórios gerais, entregas por tipo, Instagram, mídias e pesquisa de satisfação. Os relatórios gerais salvos anteriormente (inclusive exemplos em CSV) continuam armazenados no mesmo formato interno para compatibilidade, mas o botão **Baixar Excel** converte o conteúdo para `.xlsx` no momento do download. Não é necessário instalar bibliotecas adicionais ou configurar o MongoDB.

Os arquivos possuem cabeçalhos destacados, filtros e largura de coluna ajustada. Os demais módulos e o banco H2 permanecem inalterados.


## Identidade visual Planeta Atlântida 2027

As imagens de marca foram extraídas do arquivo fornecido `Visual_PA27_padrão.pdf` e incluídas localmente em `frontend/public/branding/`.
- `logo-pa27.png`: símbolo do Planeta Atlântida 2027 (extraído do PDF).
- `login-pa27.jpg`: arte da página 5, exibida no login.
- `banner-pa27.jpg`: arte da página 6, exibida no painel.
- `logo-hero-pa27.jpg` e `festival-pa27.jpg`: artes adicionais das páginas 7 e 9 para reutilização.

O frontend não depende de URLs externas para estas imagens. Nenhuma configuração do MongoDB foi adicionada.


### Logo do perfil RBS
O avatar da equipe RBS usa `frontend/public/branding/perfil-rbs-pa27.png`. Atualize o navegador com Ctrl+Shift+R.
