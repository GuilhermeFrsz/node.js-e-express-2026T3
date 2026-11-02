// register.js
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("./db");

const router = express.Router();

// Rota para registrar um novo usuário
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  // Validação simples
  if (!name || !email || !password) {
    return res.status(400).send("Nome, email e senha são obrigatórios.");
  }

  try {
    // Verifica se o email já está em uso
    const { rows: existingUsers } = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );
    if (existingUsers.length > 0) {
      return res.status(409).send("Este email já está em uso.");
    }

    // Criptografa a senha antes de salvar
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insere o novo usuário no banco de dados
    const { rows } = await db.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
      [name, email, passwordHash],
    );

    // Retorna o usuário criado (sem a senha)
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    res.status(500).send("Erro interno ao tentar registrar o usuário.");
  }
});

module.exports = router;
