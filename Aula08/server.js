const express = require("express");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const basicAuth = require("express-basic-auth");

const app = express();
const PORT = 3000;

app.use(express.json());

// --- 1. Configuração da Autenticação Básica ---
const auth = basicAuth({
  users: { admin: "supersecret" },
  challenge: true,
  unauthorizedResponse: "Acesso não autorizado. Credenciais inválidas.",
});

// --- 2. Configurações do Swagger JSDoc ---
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Tarefas",
      version: "1.0.0",
      description: "Uma API simples para gerenciar tarefas (CRUD)",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: [path.join(__dirname, "server.js")]
};

const specs = swaggerJsdoc(options);

// Rota para a documentação do Swagger (protegida)
app.use("/api-docs", auth, swaggerUi.serve, swaggerUi.setup(specs));

// --- 3. Banco de Dados em Memória ---
let tasks = [
  { id: 1, title: "Aprender Swagger", completed: false },
  { id: 2, title: "Configurar Autenticação", completed: true },
];
let nextId = 3;

// --- 4. Schemas do Swagger ---
/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         id:
 *           type: integer
 *           description: O ID gerado automaticamente para a tarefa
 *         title:
 *           type: string
 *           description: O título da tarefa
 *         completed:
 *           type: boolean
 *           description: O status da tarefa
 *       example:
 *         id: 1
 *         title: "Aprender Swagger"
 *         completed: false
 *     TaskInput:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           description: O título da tarefa
 *         completed:
 *           type: boolean
 *           description: O status da tarefa (opcional, padrão false)
 *       example:
 *         title: "Documentar minha API"
 *         completed: false
 */

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: API para gerenciamento de tarefas
 */

// --- 5. Endpoints (Rotas) ---

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Retorna a lista de todas as tarefas
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: A lista de tarefas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 */
app.get("/tasks", (req, res) => {
  res.status(200).json(tasks);
});

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Busca uma tarefa pelo ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tarefa encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Tarefa não encontrada
 */
app.get("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find((t) => t.id === id);
  if (!task) return res.status(404).json({ erro: "Tarefa não encontrada." });
  res.status(200).json(task);
});

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Cria uma nova tarefa
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskInput'
 *     responses:
 *       201:
 *         description: A tarefa foi criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Dados inválidos
 */
app.post("/tasks", (req, res) => {
  const { title, completed } = req.body;
  
  if (!title) {
    return res.status(400).json({ erro: "O título é obrigatório." });
  }
  
  const newTask = {
    id: nextId++,
    title,
    completed: completed || false,
  };
  
  tasks.push(newTask);
  res.status(201).json(newTask);
});

/**
 * @swagger
 * /tasks/{id}:
 *   patch:
 *     summary: Atualiza parcialmente uma tarefa
 *     description: "Permite atualizar apenas campos específicos (ex: marcar como concluída) sem reenviar todos os dados."
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             completed: true
 *     responses:
 *       200:
 *         description: Tarefa atualizada com sucesso.
 *       404:
 *         description: Tarefa não encontrada.
 *       400:
 *         description: Nenhum campo fornecido.
 */
app.patch("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return res.status(404).json({ erro: "Tarefa não encontrada." });
  }

  const { title, completed } = req.body;

  if (title === undefined && completed === undefined) {
    return res.status(400).json({ erro: "Envie ao menos um campo para atualizar." });
  }

  if (title !== undefined) task.title = title;
  if (completed !== undefined) task.completed = completed;

  res.status(200).json(task);
});

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Remove uma tarefa
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Tarefa removida com sucesso.
 *       404:
 *         description: Tarefa não encontrada.
 */
app.delete("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);
  
  if (index === -1) {
    return res.status(404).json({ erro: "Tarefa não encontrada." });
  }
  
  tasks.splice(index, 1);
  res.status(204).send();
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Documentação disponível em http://localhost:${PORT}/api-docs`);
});