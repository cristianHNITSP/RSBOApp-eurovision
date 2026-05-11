"use strict";

const express = require("express");
const router = express.Router();
const mermaController = require("../controllers/merma.controller");
const { protect } = require("../utils/auth");

/**
 * Rutas de Mermas para Óptica
 */
router.post("/", protect(), mermaController.create);
router.get("/", protect(), mermaController.list);
router.get("/:id", protect(), mermaController.detail);

module.exports = router;
