const express = require("express");
const router = express.Router();

const userRoutes = require("./userRoutes.js");
const taskRoutes = require("./taskRoutes.js");

router.use("/auth", userRoutes);
router.use("/tasks", taskRoutes);

module.exports = router;