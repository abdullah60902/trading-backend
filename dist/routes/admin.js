"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
// Public Admin Route
router.post('/login', adminController_1.adminLogin);
// Apply auth & admin middleware to all routes in this file below
router.use(auth_1.requireAdminAuth);
// Dashboard
router.get('/dashboard', adminController_1.getDashboardStats);
// Users
router.get('/users', adminController_1.getUsers);
router.patch('/users/:id/status', adminController_1.updateUserStatus);
// Transactions (Deposits/Withdrawals)
router.get('/transactions', adminController_1.getTransactions);
router.post('/transactions/:id/process', adminController_1.processTransaction);
// Staking Management
router.get('/staking-plans', adminController_1.getAllStakingPlans);
// MLM Management
router.get('/mlm-stats', adminController_1.getMLMStats);
// Support Tickets
router.get('/support', adminController_1.getSupportTickets);
router.post('/support/:id/reply', adminController_1.replySupportTicket);
// Announcements
router.get('/announcements', adminController_1.getAnnouncements);
router.post('/announcements', adminController_1.createAnnouncement);
router.put('/announcements/:id', adminController_1.updateAnnouncement);
router.delete('/announcements/:id', adminController_1.deleteAnnouncement);
// Banners
router.get('/banners', adminController_1.getBanners);
router.post('/banners', adminController_1.createBanner);
router.put('/banners/:id', adminController_1.updateBanner);
router.delete('/banners/:id', adminController_1.deleteBanner);
// Jackpots
router.get('/jackpots', adminController_1.getJackpots);
router.post('/jackpots', adminController_1.createJackpotRound);
router.post('/jackpots/:id/draw', adminController_1.drawJackpot);
// Salaries
router.get('/salaries', adminController_1.getSalaries);
router.post('/salaries', adminController_1.saveSalaryConfig);
router.post('/salaries/:id/pay', adminController_1.paySalary);
// Logs
router.get('/logs', adminController_1.getAdminLogs);
exports.default = router;
