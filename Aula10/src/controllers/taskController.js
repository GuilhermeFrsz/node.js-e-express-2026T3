const db = require("../db/index.js");

exports.createTask = async (req, res) => {
  const { title, description } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO tasks (title, description, user_id) VALUES ($1, $2, $3) RETURNING *",
      [title, description, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao criar tarefa." });
  }
};

exports.getTasksByUser = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM tasks WHERE user_id = $1", [req.user.id]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar tarefas." });
  }
};