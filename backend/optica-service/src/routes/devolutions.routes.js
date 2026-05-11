"use strict";

const express = require("express");
const router = express.Router();
const devolutionController = require("../controllers/devolution.controller");
const { protect } = require("../utils/auth");

router.get("/", protect(), devolutionController.list);
router.post("/", protect(), devolutionController.create);
router.patch("/status/:idOrFolio", protect(), devolutionController.updateStatus);

module.exports = router;
