// Exemplo de configuração em um arquivo db.js
const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "task_manager", // O nome do nosso banco!
  password: "guime123",
  port: 5432,
});

// Exportamos uma função para executar queries
module.exports = {
  query: (text, params) => pool.query(text, params),
};