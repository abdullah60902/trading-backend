"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coinController_1 = require("../controllers/coinController");
const router = (0, express_1.Router)();
// Public route to fetch coin data for charts
router.get('/markets', coinController_1.getCoinData);
exports.default = router;
