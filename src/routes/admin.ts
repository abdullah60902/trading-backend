import express from 'express';
import { requireAdminAuth } from '../middleware/auth';
import {
  adminLogin,
  getDashboardStats,
  getUsers,
  updateUserStatus,
  getTransactions,
  processTransaction,
  getSupportTickets,
  replySupportTicket,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getJackpots,
  drawJackpot,
  getSalaries,
  paySalary,
  getAdminLogs,
  getAllStakingPlans,
  getMLMStats,
  createJackpotRound,
  saveSalaryConfig
} from '../controllers/adminController';

const router = express.Router();

// Public Admin Route
router.post('/login', adminLogin);

// Apply auth & admin middleware to all routes in this file below
router.use(requireAdminAuth);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Users
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);

// Transactions (Deposits/Withdrawals)
router.get('/transactions', getTransactions);
router.post('/transactions/:id/process', processTransaction);

// Staking Management
router.get('/staking-plans', getAllStakingPlans);

// MLM Management
router.get('/mlm-stats', getMLMStats);

// Support Tickets
router.get('/support', getSupportTickets);
router.post('/support/:id/reply', replySupportTicket);

// Announcements
router.get('/announcements', getAnnouncements);
router.post('/announcements', createAnnouncement);
router.put('/announcements/:id', updateAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);

// Banners
router.get('/banners', getBanners);
router.post('/banners', createBanner);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

// Jackpots
router.get('/jackpots', getJackpots);
router.post('/jackpots', createJackpotRound);
router.post('/jackpots/:id/draw', drawJackpot);

// Salaries
router.get('/salaries', getSalaries);
router.post('/salaries', saveSalaryConfig);
router.post('/salaries/:id/pay', paySalary);

// Logs
router.get('/logs', getAdminLogs);

export default router;
