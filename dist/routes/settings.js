"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validators_1 = require("../utils/validators");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, settingsController_1.getSettings);
router.put('/', auth_1.requireAdminAuth, (0, validation_1.validate)(validators_1.updateSettingsSchema), settingsController_1.updateSetting);
// User Directory Administration
router.get('/users', auth_1.requireAdminAuth, settingsController_1.getAllUsers);
router.put('/users/:userId/status', auth_1.requireAdminAuth, settingsController_1.updateUserStatus);
exports.default = router;
