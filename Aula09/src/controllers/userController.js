const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/index.js");

exports.registerUser = async (req, res) => {
  const { name, username, email, password } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const result = await db.query(
      "INSERT INTO users (name, username, email, password) VALUES ($1, $2, $3, $4) RETURNING id, name, username, email",
      [name, username, email, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.log("ERRO NO CADASTRO:", err); // <-- ADICIONE ESTA LINHA
    res.status(500).json({ erro: "Erro ao registrar usuário." });
  }
};

exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) return res.status(401).json({ erro: "Credenciais inválidas." });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ erro: "Credenciais inválidas." });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao fazer login." });
  }
};