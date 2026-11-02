const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController.js");
const authMiddleware = require("../middlewares/authMiddleware.js");

// O authMiddleware protege todas as rotas deste arquivo
router.post("/", authMiddleware, taskController.createTask);
router.get("/", authMiddleware, taskController.getTasksByUser);

module.exports = router;