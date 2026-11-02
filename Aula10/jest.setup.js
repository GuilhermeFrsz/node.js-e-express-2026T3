// Carrega as variáveis de ambiente antes de criar o pool do PostgreSQL.
require("./server");
const db = require("./src/db");

afterAll(async () => {
  await db.end();
});
