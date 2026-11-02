// src/operacoes.js
function somar(a, b) {
  return a + b;
}

function subtrair(a, b) {
  return a - b;
}

// Exporta as funções para que possam ser usadas em outros arquivos
module.exports = {
  somar,
  subtrair,
};