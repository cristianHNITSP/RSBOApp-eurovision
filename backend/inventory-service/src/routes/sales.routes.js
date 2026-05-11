"use strict";

const express = require("express");
const router = express.Router();
const salesController = require("../controllers/sales.controller");
const { protect } = require("../utils/auth");

router.post("/", protect(), salesController.registerSale);
router.get("/", protect(), salesController.listSales);

module.exports = router;
