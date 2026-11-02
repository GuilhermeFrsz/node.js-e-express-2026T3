const operacoes = require("./operacoes.js");

const {format} = require("date-fns")

const resultadoSoma = operacoes.somar(10, 5);
const resultadoSubtracao = operacoes.subtrair(10, 5);

console.log("Resultado da soma:", resultadoSoma);
console.log("Resultado da subtração:", resultadoSubtracao);

const   dataAtualFormatada = format(new Date(), "dd/MM/yyyy HH:mm:ss");
console.log("Data atual: ", dataAtualFormatada);