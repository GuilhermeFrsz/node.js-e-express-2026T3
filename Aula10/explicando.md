# Entendendo a API e os testes

Este guia acompanha o projeto passo a passo, desde o comando `npm test` até a consulta ao PostgreSQL. A ideia é ajudar quem está começando: primeiro apresentamos as peças, depois seguimos uma requisição real pelo código e, por fim, explicamos como os testes exercitam esse fluxo.

> **Importante:** os testes de autenticação e tarefas deste projeto usam o banco PostgreSQL configurado no `.env`. Eles não usam um banco falso. Portanto, ao executar os testes, a API pode inserir usuários nesse banco.

## 1. O que existe neste projeto

Uma API é um programa que recebe pedidos HTTP e devolve respostas HTTP. Por exemplo, um cliente pode enviar `POST /api/auth/login` com usuário e senha. A API verifica os dados e responde com um token ou com um erro.

As partes principais deste projeto são:

| Arquivo ou pasta | Responsabilidade |
| --- | --- |
| `start.js` | Inicia o servidor HTTP para uso normal. |
| `server.js` | Monta a aplicação Express, carrega configurações e registra as rotas. |
| `src/routes/` | Associa caminhos HTTP a funções que os atendem. |
| `src/middlewares/` | Executa verificações antes de uma rota, como validar o token. |
| `src/controllers/` | Implementa o que cada operação faz e monta as respostas. |
| `src/db/index.js` | Cria o pool de conexões PostgreSQL e oferece funções para consultar o banco. |
| `__tests__/` | Contém os testes automatizados. |
| `jest.setup.js` | Prepara cada suíte de testes e fecha o pool do banco ao final dela. |
| `.env` | Guarda configurações locais, como acesso ao banco e segredo do JWT. |

O caminho geral de uma requisição é:

```text
Cliente ou teste
      ↓ HTTP
server.js (aplicação Express)
      ↓
src/routes (escolhe a rota)
      ↓
middleware (se a rota exigir autenticação)
      ↓
controller (executa a regra da operação)
      ↓
src/db/index.js
      ↓ SQL
PostgreSQL
      ↑ resultado
controller monta a resposta HTTP
      ↑
Cliente ou teste
```

## 2. Como iniciar a API

O `package.json` define os comandos do projeto:

```json
"scripts": {
  "start": "node start.js",
  "dev": "nodemon start.js",
  "test": "jest"
}
```

`npm start` executa `start.js`. Esse arquivo importa a aplicação de `server.js` e chama `app.listen(...)`, que abre uma porta HTTP (por padrão, a porta `3000`). É isso que permite a um programa externo enviar pedidos para a API.

Os testes fazem algo diferente: importam a aplicação diretamente e usam Supertest para enviar pedidos a ela sem precisar iniciar uma porta com `app.listen`. Assim, eles exercitam as rotas Express sem deixar um servidor HTTP tradicional rodando.

## 3. Como `server.js` prepara a aplicação

No início, `server.js` carrega `path` e lê o arquivo `.env` localizado na raiz do projeto:

```js
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
  quiet: true,
});
```

O `.env` transforma configurações escritas como `NOME=valor` em variáveis disponíveis em `process.env`. Por exemplo, o código pode ler `process.env.JWT_SECRET` sem deixar o segredo escrito diretamente no controlador.

`path.resolve(__dirname, ".env")` monta o caminho do `.env` a partir da pasta de `server.js`, em vez de depender da pasta na qual o terminal foi aberto. `quiet: true` pede ao `dotenv` para não imprimir o diagnóstico de variáveis carregadas.

Em seguida, `server.js` cria o Express, habilita leitura de JSON e registra as rotas:

```js
const express = require("express");
const mainRouter = require("./src/routes");

const app = express();
app.use(express.json());
app.use("/api", mainRouter);
```

`express.json()` permite que o Express interprete um corpo JSON, como `{"username":"ana"}`, e o disponibilize em `req.body`.

O middleware de log definido no mesmo arquivo imprime método e caminho de cada pedido quando `NODE_ENV` não é `production`. Por exemplo: `POST /api/auth/login`. Depois, `app.use("/api", mainRouter)` diz que todas as rotas importadas começam com `/api`.

Note que `server.js` **exporta** a aplicação, mas não chama `listen`. Isso é útil para os testes: eles podem importar a aplicação sem abrir um servidor à parte.

## 4. Como os caminhos são montados

Em `src/routes/index.js`, o roteador principal liga dois grupos:

```js
router.use("/auth", userRoutes);
router.use("/tasks", taskRoutes);
```

Como `server.js` já adicionou o prefixo `/api`, os caminhos finais ficam assim:

| Grupo | Caminho final |
| --- | --- |
| `userRoutes` | `/api/auth/...` |
| `taskRoutes` | `/api/tasks/...` |

Em `src/routes/userRoutes.js`, o grupo de autenticação define:

| Método e caminho | Função chamada | Para que serve |
| --- | --- | --- |
| `POST /api/auth/register` | `registerUser` | Cadastrar usuário. |
| `POST /api/auth/login` | `loginUser` | Verificar credenciais e emitir JWT. |

Em `src/routes/taskRoutes.js`, o grupo de tarefas define:

| Método e caminho | Protegida por token? | Função chamada |
| --- | --- | --- |
| `POST /api/tasks` | Sim | `createTask` |
| `GET /api/tasks` | Sim | `getTasksByUser` |

O `router.post("/", ...)` usa a raiz do grupo de tarefas; como o grupo foi montado em `/api/tasks`, o caminho final é `/api/tasks`.

## 5. O que é um controller

Uma rota decide **qual função** recebe o pedido. O controller implementa o trabalho dessa operação: lê os dados, chama o banco e escolhe o status e o JSON de resposta.

Por exemplo, em `userRoutes.js`:

```js
router.post("/register", userController.registerUser);
```

Isso significa: quando chega um `POST /api/auth/register`, o Express chama `registerUser(req, res)`. `req` representa o pedido recebido; `res` é usado para construir a resposta.

## 6. Cadastro de usuário, passo a passo

O cadastro é implementado por `registerUser` em `src/controllers/userController.js`.

1. O cliente envia um pedido `POST /api/auth/register` com JSON. Um exemplo de corpo é:

   ```json
   {
     "name": "Ana",
     "username": "ana123",
     "email": "ana@example.test",
     "password": "uma-senha"
   }
   ```

2. `express.json()` interpreta o corpo e o controlador lê `req.body`:

   ```js
   const { name, username, email, password } = req.body;
   ```

   Essa sintaxe extrai as quatro propriedades do objeto.

3. `bcryptjs` gera um salt e transforma a senha em um hash:

   ```js
   const salt = await bcrypt.genSalt(10);
   const hashedPassword = await bcrypt.hash(password, salt);
   ```

   A senha original não é enviada para a coluna `password`. O banco recebe o hash. Mais tarde, o login compara uma senha recebida com esse hash.

4. O controlador chama `db.query(...)` com um `INSERT` parametrizado. Os valores são enviados no array separado (`[name, username, email, hashedPassword]`) e associados aos marcadores `$1`, `$2` etc. Essa forma evita montar SQL concatenando diretamente os dados recebidos.

5. `RETURNING id, name, username, email` pede ao PostgreSQL que devolva os campos indicados. A senha nem sequer é incluída nessa resposta do banco.

6. Se o cadastro der certo, a API responde com status `201` (criado) e um JSON com os dados públicos. Se ocorrer uma exceção, o `catch` responde `500` (erro interno).

O código atual não valida explicitamente campos ausentes ou formatos de e-mail. Também não converte erros de unicidade em `409 Conflict`; essa regra dependerá da estrutura do banco e do tratamento implementado.

## 7. Login e token JWT, passo a passo

O login é implementado por `loginUser`:

1. O cliente envia `POST /api/auth/login` com `username` e `password`.
2. O controller procura o usuário com uma consulta parametrizada: `SELECT * FROM users WHERE username = $1`.
3. Se nenhum registro for encontrado, retorna `401 Unauthorized` (credenciais inválidas).
4. Se houver usuário, `bcrypt.compare(password, user.password)` compara a senha enviada com o hash guardado no banco. O programa não precisa descriptografar o hash.
5. Se a comparação falhar, também responde `401`.
6. Se passar, `jsonwebtoken` cria um JWT contendo o identificador do usuário:

   ```js
   jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" })
   ```

   O segredo em `JWT_SECRET` assina o token. `expiresIn: "1h"` limita sua validade a uma hora. O cliente recebe o token e deve enviá-lo nas próximas chamadas protegidas.

7. A resposta de sucesso tem status `200` e formato `{ "token": "..." }`.

Um JWT assinado permite verificar se o conteúdo foi emitido por quem conhece o segredo e se ainda está válido. O conteúdo não deve ser tratado como secreto: tokens JWT comuns são codificados, não criptografados.

## 8. Como o middleware protege tarefas

As duas rotas de tarefa colocam `authMiddleware` antes do controller:

```js
router.get("/", authMiddleware, taskController.getTasksByUser);
```

O Express executa essas funções na ordem em que aparecem. Primeiro roda `authMiddleware`; o controller só é chamado se o middleware chamar `next()`.

O middleware faz o seguinte:

1. Lê o cabeçalho `Authorization` do pedido.
2. Exige que o valor comece com `Bearer `, por exemplo `Authorization: Bearer eyJ...`.
3. Extrai o token que vem depois de `Bearer `.
4. Executa `jwt.verify(token, process.env.JWT_SECRET)`. Isso verifica assinatura e validade.
5. Quando o token é válido, copia o conteúdo decodificado para `req.user` e chama `next()`.
6. Se não houver token ou ele for inválido/expirado, responde `401` e encerra a cadeia. O controller de tarefas não executa.

Como o login assina `{ id: user.id }`, o middleware disponibiliza `req.user.id`. O controller usa esse identificador para limitar o acesso às tarefas daquele usuário.

## 9. Consulta e criação de tarefas

`getTasksByUser` executa:

```sql
SELECT * FROM tasks WHERE user_id = $1
```

O parâmetro `$1` recebe `req.user.id`. Assim, o endpoint lista apenas tarefas cujo `user_id` corresponde ao usuário do token. Em caso de sucesso, retorna `200` e um array JSON (inclusive `[]` se não houver tarefas). Em erro de banco, retorna `500`.

`createTask` lê `title` e `description` de `req.body` e insere esses valores junto com `req.user.id`:

```sql
INSERT INTO tasks (title, description, user_id)
VALUES ($1, $2, $3)
RETURNING *
```

O usuário não escolhe livremente o `user_id` no JSON: a API obtém esse valor do token validado. Isso vincula a tarefa à identidade autenticada. Em caso de sucesso responde `201` e o registro criado.

## 10. A camada do PostgreSQL

`src/db/index.js` cria um `Pool` da biblioteca `pg` usando `DB_USER`, `DB_HOST`, `DB_DATABASE`, `DB_PASSWORD` e `DB_PORT`, todos lidos de `process.env`.

Um pool mantém e reutiliza conexões com o banco, em vez de abrir uma conexão nova manualmente para cada consulta. O módulo exporta duas funções usadas pelo resto da aplicação:

- `query(text, params)`: envia um comando SQL e seus parâmetros ao PostgreSQL.
- `end()`: encerra o pool e suas conexões.

O arquivo `server.js` carrega o `.env` antes de importar as rotas. As rotas importam os controllers, que importam `src/db/index.js`. A ordem importa: as variáveis precisam existir antes de `new Pool(...)` ler os valores de conexão.

O projeto precisa de um PostgreSQL acessível e das tabelas esperadas pelo SQL (pelo menos `users` e `tasks`, com as colunas usadas nos controllers). O código mostrado não cria essas tabelas automaticamente. Confira a configuração e o schema do banco antes de executar os testes.

## 11. Como os testes funcionam

Jest procura os arquivos de teste e executa cada suíte. Neste projeto, as suítes são `__tests__/auth.test.js` e `__tests__/tasks.test.js`. Supertest cria pedidos para a aplicação Express importada por cada arquivo:

```js
const request = require("supertest");
const app = require("../server");
```

`request(app).post(...).send(...)` envia um pedido com JSON. O objeto retornado contém, entre outras coisas, `statusCode` e `body`. O Jest compara esses resultados com expectativas como `expect(response.statusCode).toBe(201)`.

### Testes de autenticação

`auth.test.js` cria um identificador aleatório para não depender de um nome fixo usado em uma execução anterior. Depois verifica:

1. **Cadastro:** espera status `201`, os campos públicos, um `id` e a ausência de `password` na resposta.
2. **Login:** usa o mesmo usuário e senha e espera status `200` com uma propriedade `token`.
3. **Senha incorreta:** espera status `401`.

Esses testes atravessam a aplicação, os controllers e o banco real configurado. Não são apenas testes unitários isolados de uma função.

### Testes de tarefas

`tasks.test.js` usa `beforeAll` para cadastrar um usuário de teste e fazer login uma vez antes dos testes do grupo. O token recebido é guardado na variável `token`.

Depois verifica:

1. **Sem token:** `GET /api/tasks` deve responder `401`.
2. **Com token:** a mesma rota deve responder `200` e o corpo deve ser um array.
3. **Token inválido:** deve responder `401`.

`beforeAll` é um hook do Jest: uma preparação executada antes dos testes daquele `describe`. `describe` agrupa testes relacionados; `it` (ou `test`) define um caso individual.

Esses testes não criam uma tarefa. O caso com token confirma que a requisição autenticada consegue chegar ao endpoint e que a resposta tem formato de lista; o banco precisa aceitar a consulta.

## 12. O setup e o encerramento dos testes

No `package.json`, Jest está configurado com:

```json
"setupFilesAfterEnv": ["<rootDir>/jest.setup.js"]
```

Jest executa esse arquivo para cada ambiente de teste, depois de instalar as funções globais como `afterAll`. `jest.setup.js` importa primeiro `server.js`, fazendo com que o `.env` seja carregado e o caminho da aplicação inicializado. Depois obtém o módulo do banco e registra:

```js
afterAll(async () => {
  await db.end();
});
```

`afterAll` roda uma vez depois dos testes daquela suíte. `await` faz o Jest esperar o pool terminar antes de considerar a suíte encerrada. Conexões abertas podem manter processos ativos, por isso a limpeza faz parte do ciclo normal dos testes.

O antigo `__tests__/teardown.js` estava dentro da pasta que o Jest usa para procurar testes. Como ele só exportava uma função de limpeza e não continha nenhum `test`/`it`, o Jest o tratava como uma suíte vazia e reclamava: **“Your test suite must contain at least one test.”** A limpeza foi movida para a configuração de setup, fora da pasta de descoberta das suítes.

## 13. Executando os comandos

No terminal, na pasta do projeto:

```powershell
npm test
```

Esse comando executa o script `test` (`jest`). Uma saída `PASS` em cada arquivo indica que as expectativas daquela suíte passaram. Um erro de conexão ou de tabela pode indicar configuração ou disponibilidade do banco, não necessariamente um problema no Jest.

Para iniciar a API normalmente:

```powershell
npm start
```

O terminal deve indicar que o servidor está ouvindo na porta configurada (por padrão `3000`). Enquanto esse processo estiver ativo, um cliente HTTP pode chamar os endpoints.

## 14. Como ler a saída original do Jest

Na saída analisada, `tasks.test.js` e `auth.test.js` aparecem como `PASS`, com seis testes aprovados no total. O comando ainda falhou porque também executou `__tests__/teardown.js` como uma suíte sem testes. Eram dois assuntos diferentes:

- **Falha que torna o resultado geral vermelho:** a suíte vazia `teardown.js`.
- **Aviso de encerramento:** um processo de worker demorou para fechar, compatível com recursos de banco abertos ao fim dos testes.
- **Mensagens do dotenv:** diagnóstico da leitura do `.env`, não falhas das verificações.

As alterações neste projeto tratam essas três situações: o teardown saiu da pasta de testes, o pool é fechado ao final de cada suíte, e `dotenv` está configurado para não imprimir o diagnóstico.

## 15. Status HTTP que aparecem no código

| Status | Significado prático neste projeto |
| --- | --- |
| `200` | A operação foi concluída (por exemplo, login ou listagem). |
| `201` | Um recurso foi criado (cadastro ou tarefa). |
| `401` | Falta autenticação válida ou as credenciais/token não foram aceitos. |
| `500` | O servidor encontrou um erro ao executar a operação, como uma exceção no acesso ao banco. |

O status é parte importante da resposta: ele permite que clientes saibam se devem usar os dados, solicitar login ou tratar uma falha.

## 16. Termos para guardar

- **Endpoint:** combinação de método HTTP e caminho, como `GET /api/tasks`.
- **Request/pedido:** dados recebidos pela API (`req`), incluindo caminho, cabeçalhos e corpo.
- **Response/resposta:** status, cabeçalhos e corpo enviados pela API (`res`).
- **Middleware:** função executada durante o caminho do pedido; pode validar, modificar ou encerrar a requisição.
- **Controller:** função que implementa uma operação e monta sua resposta.
- **JWT:** token assinado usado aqui para representar a identidade autenticada por tempo limitado.
- **Pool:** conjunto reutilizável de conexões ao PostgreSQL.
- **Hash de senha:** representação de mão única usada para verificar uma senha sem guardá-la em texto puro.
- **Suíte de testes:** conjunto de casos agrupados, normalmente um arquivo de teste.
- **Hook:** função do ciclo de testes, como `beforeAll` e `afterAll`.
- **Supertest:** biblioteca que envia pedidos HTTP à aplicação durante os testes.

## 17. Um resumo de ponta a ponta

Para listar tarefas, o cliente envia `GET /api/tasks` com `Authorization: Bearer <token>`. `server.js` recebe o pedido; o roteador principal encaminha para `taskRoutes`; `authMiddleware` valida o token usando `JWT_SECRET` e põe o identificador em `req.user.id`; `getTasksByUser` busca as tarefas desse identificador com uma consulta parametrizada; o PostgreSQL devolve as linhas; o controller responde `200` com o array. O teste de lista autenticada repete esse caminho e verifica o status e o formato do corpo.

Para cadastrar, o fluxo é parecido, mas o pedido vai a `POST /api/auth/register`. A rota chama `registerUser`, que transforma a senha em hash, insere os dados no banco e responde `201` com campos públicos. O teste de cadastro verifica que o usuário foi criado e que a senha não apareceu na resposta.

Esse é o ciclo central para entender o projeto: **rota escolhe o controller, middleware protege quando necessário, controller conversa com o banco e devolve uma resposta, e o teste confere o comportamento observável**.
