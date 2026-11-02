const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json());

// Middleware de Logging
app.use((req, res, next) => {
  const dataHora = new Date().toLocaleString("pt-BR");
  console.log(`[${dataHora}] Nova requisição: ${req.method} ${req.url}`);
  
  // O next() avisa o Express para seguir em frente e ir para as rotas
  next(); 
});

// Banco de dados em memória
let produtos = [
  {
    id: 1,
    nome: "Notebook Gamer",
    preco: 7500,
    estoque: 30,
    categoria: "Eletrônicos",
  },
  {
    id: 2,
    nome: "Cadeira de Escritório",
    preco: 1200,
    estoque: 50,
    categoria: "Móveis",
  },
];

// 1. Endpoint para listar todos os produtos
app.get("/products", (req, res) => {
  res.json(produtos);
});

// 2. Endpoint para buscar um produto específico
app.get("/products/:id", (req, res) => {
  const { id } = req.params;
  const produto = produtos.find((p) => p.id === Number(id));
  if (produto) {
    res.json(produto);
  } else {
    res.status(404).send("Produto não encontrado.");
  }
});

// 3. Endpoint para adicionar um novo produto (CORRIGIDO)
app.post("/products", (req, res) => {
  const { nome, preco, estoque, categoria } = req.body;
 
  if (!nome || !preco || preco <= 0) {
    return res.status(400).json({ erro: "Nome e preço > 0 obrigatórios" });
  } else {
    // Lógica corrigida para o ID: pega o maior ID atual ou 1 se o array estiver vazio
    const novoId = produtos.length > 0 ? produtos[produtos.length - 1].id + 1 : 1;
    
    const novoProduto = {
      id: novoId,
      nome: nome,
      preco: parseFloat(preco),
      estoque: parseInt(estoque),
      categoria: categoria,
    };

    produtos.push(novoProduto);

    res.status(201).json({
      mensagem: "Produto adicionado com sucesso.",
      produto: novoProduto
    });
  }
});

// 4. Endpoint para modificar um produto
app.put("/products/:id", (req, res) => {
  const { id } = req.params;
  const index = produtos.findIndex((p) => p.id === Number(id));
  if (index !== -1) {
    produtos[index] = { ...produtos[index], ...req.body };
    res.json(produtos[index]);
  } else {
    res.status(404).send("Produto não localizado.");
  }
});

app.patch("/products/:id", (req, res) => {
  const { id } = req.params;
  const index = produtos.findIndex((p) => p.id === Number(id));
  
  if (index !== -1) {
    produtos[index] = { ...produtos[index], ...req.body };
    res.json(produtos[index]);
  } else {
    res.status(404).send("Produto não localizado."); 
  }
});


// 5. Endpoint para remover um produto
app.delete("/products/:id", (req, res) => {
  const { id } = req.params;
  produtos = produtos.filter((p) => p.id !== Number(id));
  res.status(200).send("Produto removido com sucesso.");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});