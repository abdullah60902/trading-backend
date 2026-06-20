import { Router } from 'express';
import {
  getBalances,
  getDepositAddress,
  transfer,
  transferInternal,
  withdraw,
  trade,
  approveWithdrawal,
  requestDeposit,
  verifyDeposit,
  getDepositRequests,
  getWithdrawalRequests,
  getTransactions,
  getUserDeposits,
  getUserWithdrawals,
} from '../controllers/walletController';
import { requireAuth, requireAdminAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { transferSchema, withdrawalSchema, tradeSchema } from '../utils/validators';
import { uploadDepositScreenshot } from '../utils/uploadDeposit';

const router = Router();

// Admin-only routes for processing deposits and withdrawals
router.get('/deposits', requireAdminAuth, getDepositRequests);
router.post('/deposits/:transactionId/action', requireAdminAuth, verifyDeposit);
router.get('/withdrawals', requireAdminAuth, getWithdrawalRequests);
router.post('/withdrawals/:transactionId/action', requireAdminAuth, approveWithdrawal);

// All wallet routes require regular user auth
router.use(requireAuth);

router.get('/balances', getBalances);
router.get('/address/:currency', getDepositAddress);
router.get('/transactions', getTransactions);
router.post('/transfer', validate(transferSchema), transfer);
router.post('/transfer-internal', transferInternal);
router.post('/deposit-request', uploadDepositScreenshot, requestDeposit);
router.post('/withdraw', validate(withdrawalSchema), withdraw);
router.post('/trade', validate(tradeSchema), trade);
router.get('/my-deposits', getUserDeposits);
router.get('/my-withdrawals', getUserWithdrawals);

export default router;
