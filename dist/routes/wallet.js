"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const walletController_1 = require("../controllers/walletController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validators_1 = require("../utils/validators");
const uploadDeposit_1 = require("../utils/uploadDeposit");
const router = (0, express_1.Router)();
// Admin-only routes for processing deposits and withdrawals
router.get('/deposits', auth_1.requireAdminAuth, walletController_1.getDepositRequests);
router.post('/deposits/:transactionId/action', auth_1.requireAdminAuth, walletController_1.verifyDeposit);
router.get('/withdrawals', auth_1.requireAdminAuth, walletController_1.getWithdrawalRequests);
router.post('/withdrawals/:transactionId/action', auth_1.requireAdminAuth, walletController_1.approveWithdrawal);
// All wallet routes require regular user auth
router.use(auth_1.requireAuth);
router.get('/balances', walletController_1.getBalances);
router.get('/address/:currency', walletController_1.getDepositAddress);
router.get('/transactions', walletController_1.getTransactions);
router.post('/transfer', (0, validation_1.validate)(validators_1.transferSchema), walletController_1.transfer);
router.post('/transfer-internal', walletController_1.transferInternal);
router.post('/deposit-request', uploadDeposit_1.uploadDepositScreenshot, walletController_1.requestDeposit);
router.post('/withdraw', (0, validation_1.validate)(validators_1.withdrawalSchema), walletController_1.withdraw);
router.post('/trade', (0, validation_1.validate)(validators_1.tradeSchema), walletController_1.trade);
router.get('/my-deposits', walletController_1.getUserDeposits);
router.get('/my-withdrawals', walletController_1.getUserWithdrawals);
exports.default = router;
