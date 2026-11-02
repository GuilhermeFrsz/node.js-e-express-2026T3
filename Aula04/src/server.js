// src/server.js
const express = require("express");
const app = express();
const port = 3000;

// Middleware para o Express entender JSON no corpo das requisições
app.use(express.json());

// Middleware de Autenticação
function autenticar(req, res, next) {
  const token = req.headers["x-token"]; // O cliente deve enviar o token neste cabeçalho

  if (token !== "123456") {
    // Se o token não for válido, bloqueamos a requisição com erro 401
    return res.status(401).json({ erro: "Token inválido. Acesso negado." });
  }

  // Se o token for válido, continuamos para a rota
  next();
}

// Middleware de Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next(); // Essencial para passar para o próximo middleware ou rota!
});

// Um array para simular nosso "banco de dados" em memória
let tarefas = [
  { id: 1, descricao: "Estudar Node.js", concluida: true },
  { id: 2, descricao: "Criar API com Express", concluida: false },
];

// Rota principal
app.get("/", (req, res) => {
  res.send("Bem-vindo à API de Tarefas!");
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

// GET /tarefas - Retorna todas as tarefas
app.get("/tarefas", (req, res) => {
  res.json(tarefas);
});

// POST /tarefas - Cria uma nova tarefa
app.post("/tarefas", autenticar, (req, res) => {
  const novaTarefa = {
    id: tarefas.length + 1, // Simples geração de ID
    descricao: req.body.descricao,
    concluida: false,
  };
  tarefas.push(novaTarefa);
  res.status(201).json(novaTarefa); // 201 significa "Created"
});

// PUT /tarefas/:id - Atualiza uma tarefa existente
app.put("/tarefas/:id", autenticar, (req, res) => {
  const idTarefa = parseInt(req.params.id);
  const tarefa = tarefas.find((t) => t.id === idTarefa);

  if (!tarefa) {
    return res.status(404).json({ erro: "Tarefa não encontrada" }); // 404 Not Found
  }

  tarefa.descricao = req.body.descricao || tarefa.descricao;
  tarefa.concluida =
    req.body.concluida === undefined ? tarefa.concluida : req.body.concluida;

  res.json(tarefa);
});

// DELETE /tarefas/:id - Deleta uma tarefa
app.delete("/tarefas/:id", autenticar, (req, res) => {
  const idTarefa = parseInt(req.params.id);
  const index = tarefas.findIndex((t) => t.id === idTarefa);

  if (index === -1) {
    return res.status(404).json({ erro: "Tarefa não encontrada" });
  }

  tarefas.splice(index, 1);
  res.status(204).send(); // 204 No Content
});