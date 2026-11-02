const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env"), quiet: true });

const express = require("express");
const mainRouter = require("./src/routes");

const app = express();

app.use(express.json());

// Em desenvolvimento e teste, registra cada requisição.
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

app.use("/api", mainRouter);

module.exports = app;
