import express from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getActiveJackpot,
  participateJackpot,
  getMySalaryInfo,
  getMyTickets,
  createTicket,
  replyTicket,
  getTicketDetails,
  getActiveAnnouncements
} from '../controllers/userFeaturesController';

const router = express.Router();

router.use(requireAuth);

// Jackpot
router.get('/jackpots', getActiveJackpot);
router.post('/jackpots/participate', participateJackpot);

// Salary
router.get('/salaries/me', getMySalaryInfo);

// Support
router.get('/support', getMyTickets);
router.post('/support', createTicket);
router.get('/support/:id', getTicketDetails);
router.post('/support/:id/reply', replyTicket);

// Announcements
router.get('/announcements', getActiveAnnouncements);

export default router;
