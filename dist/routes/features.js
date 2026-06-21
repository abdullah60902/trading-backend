"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const userFeaturesController_1 = require("../controllers/userFeaturesController");
const router = express_1.default.Router();
router.use(auth_1.requireAuth);
// Jackpot
router.get('/jackpots', userFeaturesController_1.getActiveJackpot);
router.post('/jackpots/participate', userFeaturesController_1.participateJackpot);
// Salary
router.get('/salaries/me', userFeaturesController_1.getMySalaryInfo);
// Support
router.get('/support', userFeaturesController_1.getMyTickets);
router.post('/support', userFeaturesController_1.createTicket);
router.get('/support/:id', userFeaturesController_1.getTicketDetails);
router.post('/support/:id/reply', userFeaturesController_1.replyTicket);
// Announcements
router.get('/announcements', userFeaturesController_1.getActiveAnnouncements);
exports.default = router;
