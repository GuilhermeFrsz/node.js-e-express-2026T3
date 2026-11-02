const app = require("./server");
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  if (process.env.NODE_ENV === "production") {
    console.log("Rodando em ambiente de PRODUÇÃO!");
  }
});
