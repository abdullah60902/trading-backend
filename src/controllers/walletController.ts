import { Response } from 'express';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { Deposit } from '../models/Deposit';
import { Withdrawal } from '../models/Withdrawal';
import { User } from '../models/User';
import { Settings } from '../models/Settings';
import { Notification } from '../models/Notification';
import { UserLog } from '../models/UserLog';
import { verifyTwoFactorToken } from '../utils/twoFactor';
import { AuthenticatedRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import crypto from 'crypto';

// Helper to log activities
const logUserActivity = async (userId: string, action: string, req: any) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    await UserLog.create({
      userId,
      action,
      ipAddress,
      userAgent,
      deviceInfo: 'Desktop',
      location: 'Local Network',
    });
  } catch (error) {
    console.error('Failed to write user log:', error);
  }
};

// Simple mock rates for limit conversions
const getExchangeRate = (from: string, to: string): number => {
  const rates: Record<string, number> = {
    'USD_BTC': 1 / 65000,
    'BTC_USD': 65000,
    'USD_ETH': 1 / 3500,
    'ETH_USD': 3500,
    'USD_USDT': 1.00,
    'USDT_USD': 1.00,
    'USDT_BTC': 1 / 65000,
    'BTC_USDT': 65000,
    'USDT_ETH': 1 / 3500,
    'ETH_USDT': 3500,
    'BTC_ETH': 65000 / 3500,
    'ETH_BTC': 3500 / 65000,
  };
  if (from === to) return 1.00;
  const key = `${from.toUpperCase()}_${to.toUpperCase()}`;
  return rates[key] || 1.00;
};

// Retrieve all wallets/balances for the logged-in user
export const getBalances = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const wallets = await Wallet.find({ userId });
    res.status(200).json({ wallets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve wallet balances.' });
  }
};

// Get deposit address for a specific currency
export const getDepositAddress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { currency } = req.params;

    const wallet = await Wallet.findOne({ userId, currency: currency.toUpperCase() });
    if (!wallet) {
      res.status(404).json({ error: `Wallet for currency ${currency} not found` });
      return;
    }

    res.status(200).json({ currency: wallet.currency, address: wallet.depositAddress });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve deposit address.' });
  }
};

// Internal Transfer between Sub-Wallets (e.g. main -> withdrawal, deposit -> main)
export const transferInternal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user?.id;
    const { currency, amount, fromWallet, toWallet } = req.body;

    const allowedWallets = ['main', 'deposit', 'earnings', 'withdrawal'];
    if (!allowedWallets.includes(fromWallet) || !allowedWallets.includes(toWallet)) {
      res.status(400).json({ error: 'Invalid sub-wallet identifier' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    if (fromWallet === toWallet) {
      res.status(400).json({ error: 'Cannot transfer between the same sub-wallets' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    if (amount <= 0) {
      res.status(400).json({ error: 'Amount must be positive' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const wallet = await Wallet.findOne({ userId, currency }).session(session);
    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const fromBalanceKey = `${fromWallet}Balance` as keyof typeof wallet;
    const toBalanceKey = `${toWallet}Balance` as keyof typeof wallet;

    const sourceBalance = Number((wallet[fromBalanceKey] as mongoose.Types.Decimal128).toString());
    const targetBalance = Number((wallet[toBalanceKey] as mongoose.Types.Decimal128).toString());

    if (sourceBalance < amount) {
      res.status(400).json({ error: `Insufficient funds in ${fromWallet} wallet` });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Set updated balances
    (wallet as any)[fromBalanceKey] = mongoose.Types.Decimal128.fromString((sourceBalance - amount).toString());
    (wallet as any)[toBalanceKey] = mongoose.Types.Decimal128.fromString((targetBalance + amount).toString());

    await wallet.save({ session });

    // Transaction History
    const txn = new Transaction({
      userId,
      walletId: wallet._id,
      type: 'transfer',
      currency,
      amount: mongoose.Types.Decimal128.fromString(amount.toString()),
      fee: mongoose.Types.Decimal128.fromString('0.00'),
      status: 'completed',
      metadata: {
        fromSubWallet: fromWallet,
        toSubWallet: toWallet,
        isInternal: true,
      },
    });
    await txn.save({ session });

    await Notification.create({
      userId,
      title: 'Internal Transfer Success',
      message: `Transferred ${amount} ${currency} from ${fromWallet} Wallet to ${toWallet} Wallet.`,
      type: 'success',
    });

    await session.commitTransaction();
    session.endSession();

    await logUserActivity(userId!, `INTERNAL_TRANSFER_${fromWallet}_TO_${toWallet}`, req);

    res.status(200).json({ message: 'Internal transfer completed successfully', wallet });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Internal transfer failed. Please try again.' });
  }
};

// External Transfer (User to User via email - transfers from sender's mainBalance to recipient's mainBalance)
export const transfer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const senderId = req.user?.id;
    const { recipientEmail, currency, amount } = req.body;

    if (amount <= 0) {
      res.status(400).json({ error: 'Transfer amount must be positive' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Find recipient
    const recipient = await User.findOne({ email: recipientEmail.toLowerCase() }).session(session);
    if (!recipient) {
      res.status(404).json({ error: 'Recipient user not found' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    if (recipient._id.toString() === senderId) {
      res.status(400).json({ error: 'Cannot transfer to yourself' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Find sender wallet
    const senderWallet = await Wallet.findOne({ userId: senderId, currency }).session(session);
    if (!senderWallet || Number(senderWallet.mainBalance.toString()) < amount) {
      res.status(400).json({ error: 'Insufficient main wallet balance' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Find or create recipient wallet
    let recipientWallet = await Wallet.findOne({ userId: recipient._id, currency }).session(session);
    if (!recipientWallet) {
      const prefix = currency === 'BTC' ? 'bc1' : currency === 'ETH' || currency === 'USDT' ? '0x' : 'usd_';
      const address = prefix + crypto.randomUUID().replace(/-/g, '').substring(0, 40);
      recipientWallet = new Wallet({
        userId: recipient._id,
        currency,
        mainBalance: 0.00,
        depositBalance: 0.00,
        earningsBalance: 0.00,
        withdrawalBalance: 0.00,
        lockedBalance: 0.00,
        depositAddress: address,
      });
      await recipientWallet.save({ session });
    }

    const senderBal = Number(senderWallet.mainBalance.toString());
    const recipientBal = Number(recipientWallet.mainBalance.toString());

    senderWallet.mainBalance = mongoose.Types.Decimal128.fromString((senderBal - amount).toString());
    recipientWallet.mainBalance = mongoose.Types.Decimal128.fromString((recipientBal + amount).toString());

    await senderWallet.save({ session });
    await recipientWallet.save({ session });

    // Transactions records
    await Transaction.create([
      {
        userId: senderId,
        walletId: senderWallet._id,
        type: 'transfer',
        currency,
        amount: mongoose.Types.Decimal128.fromString((-amount).toString()),
        fee: mongoose.Types.Decimal128.fromString('0.00'),
        status: 'completed',
        recipientAddress: recipientWallet.depositAddress,
        metadata: { recipientEmail: recipient.email, direction: 'out', label: 'User Transfer' },
      },
      {
        userId: recipient._id,
        walletId: recipientWallet._id,
        type: 'transfer',
        currency,
        amount: mongoose.Types.Decimal128.fromString(amount.toString()),
        fee: mongoose.Types.Decimal128.fromString('0.00'),
        status: 'completed',
        recipientAddress: senderWallet.depositAddress,
        metadata: { senderEmail: req.body.email, direction: 'in', label: 'User Transfer' },
      }
    ], { session });

    // Notifications
    await Notification.create([
      {
        userId: senderId,
        title: 'Transfer Sent',
        message: `Transferred ${amount} ${currency} to ${recipient.email}.`,
        type: 'success',
      },
      {
        userId: recipient._id,
        title: 'Funds Received',
        message: `Received ${amount} ${currency} from ${recipientEmail}.`,
        type: 'success',
      }
    ], { session });

    await session.commitTransaction();
    session.endSession();

    await logUserActivity(senderId!, `EXTERNAL_TRANSFER_SENT_${currency}`, req);

    res.status(200).json({ message: 'User transfer completed successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Transfer failed.' });
  }
};

// External Wallet Withdrawal request (deducts from withdrawalBalance)
export const withdraw = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user?.id;
    const { currency, amount, recipientAddress, twoFactorToken } = req.body;

    const user = await User.findById(userId).session(session);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Verify 2FA token if user has 2FA enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        res.status(400).json({ error: 'Two-factor authentication token is required' });
        await session.abortTransaction();
        session.endSession();
        return;
      }
      const isValid = verifyTwoFactorToken(user.twoFactorSecret || '', twoFactorToken);
      if (!isValid) {
        res.status(400).json({ error: 'Invalid two-factor authentication token' });
        await session.abortTransaction();
        session.endSession();
        return;
      }
    }

    // Verify Withdrawal Limit
    const limitSetting = await Settings.findOne({ key: 'WITHDRAWAL_LIMIT_USD' });
    const maxUsdLimit = limitSetting ? Number(limitSetting.value) : 10000;
    const rateToUsd = getExchangeRate(currency, 'USD');
    const requestedAmountUsd = amount * rateToUsd;

    if (requestedAmountUsd > maxUsdLimit) {
      res.status(400).json({ error: `Withdrawal exceeds daily limit of $${maxUsdLimit} USD. Your request is $${requestedAmountUsd.toFixed(2)} USD` });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const wallet = await Wallet.findOne({ userId, currency }).session(session);
    if (!wallet || Number(wallet.withdrawalBalance.toString()) < amount) {
      res.status(400).json({ error: 'Insufficient funds in Withdrawal Wallet balance' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Deduct withdrawalBalance, add to lockedBalance (processing withdrawal)
    const currentWithdrawalBal = Number(wallet.withdrawalBalance.toString());
    const currentLocked = Number(wallet.lockedBalance.toString());

    wallet.withdrawalBalance = mongoose.Types.Decimal128.fromString((currentWithdrawalBal - amount).toString());
    wallet.lockedBalance = mongoose.Types.Decimal128.fromString((currentLocked + amount).toString());
    await wallet.save({ session });

    // Create Withdrawal in 'pending' status
    const withdrawalReq = new Withdrawal({
      userId,
      walletId: wallet._id,
      currency,
      amount: mongoose.Types.Decimal128.fromString(amount.toString()),
      fee: mongoose.Types.Decimal128.fromString((amount * 0.005).toString()), // 0.5% fee
      status: 'pending',
      recipientAddress,
      txHash: '0x' + crypto.randomBytes(32).toString('hex'), // Mock block txn hash
    });
    await withdrawalReq.save({ session });

    await Notification.create({
      userId,
      title: 'Withdrawal Pending Approval',
      message: `Your withdrawal request of ${amount} ${currency} is pending admin review.`,
      type: 'info',
    });

    await session.commitTransaction();
    session.endSession();

    await logUserActivity(userId!, `WITHDRAWAL_REQUESTED_${currency}`, req);

    res.status(200).json({
      message: 'Withdrawal request submitted successfully.',
      transaction: withdrawalReq,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Withdrawal request failed.' });
  }
};

// Admin approvals for withdrawals
export const approveWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { transactionId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    const txnReq = await Withdrawal.findById(transactionId).session(session);
    if (!txnReq || txnReq.status !== 'pending') {
      res.status(404).json({ error: 'Pending withdrawal request not found' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const wallet = await Wallet.findById(txnReq.walletId).session(session);
    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const lockedVal = Number(wallet.lockedBalance.toString());
    const txnAmount = Number(txnReq.amount.toString());

    if (action === 'approve') {
      txnReq.status = 'approved';
      wallet.lockedBalance = mongoose.Types.Decimal128.fromString((lockedVal - txnAmount).toString());
      
      // Create ledger transaction
      const ledgerTxn = new Transaction({
        userId: txnReq.userId,
        walletId: txnReq.walletId,
        type: 'withdrawal',
        currency: txnReq.currency,
        amount: mongoose.Types.Decimal128.fromString(txnAmount.toString()),
        fee: txnReq.fee,
        status: 'completed',
        recipientAddress: txnReq.recipientAddress,
        txHash: txnReq.txHash
      });
      await ledgerTxn.save({ session });

      await Notification.create({
        userId: txnReq.userId,
        title: 'Withdrawal Approved',
        message: `Your withdrawal of ${txnAmount} ${txnReq.currency} has been approved and processed.`,
        type: 'success',
      });
    } else {
      txnReq.status = 'rejected';
      // Return funds back to withdrawalBalance
      const currentWithdrawalBal = Number(wallet.withdrawalBalance.toString());
      wallet.withdrawalBalance = mongoose.Types.Decimal128.fromString((currentWithdrawalBal + txnAmount).toString());
      wallet.lockedBalance = mongoose.Types.Decimal128.fromString((lockedVal - txnAmount).toString());
      await Notification.create({
        userId: txnReq.userId,
        title: 'Withdrawal Rejected',
        message: `Your withdrawal of ${txnAmount} ${txnReq.currency} was rejected. Funds returned.`,
        type: 'warning',
      });
    }

    await txnReq.save({ session });
    await wallet.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: `Withdrawal successfully ${action}d` });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to process withdrawal action.' });
  }
};

// Create a Deposit Request (requires payment screenshot)
export const requestDeposit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { currency, amount, paymentMethod } = req.body;
    // Screenshot URL comes from Cloudinary upload (req.file) or body fallback
    const screenshotUrl = (req as any).file?.path || req.body.screenshotUrl || '';

    if (amount <= 0) {
      res.status(400).json({ error: 'Deposit amount must be positive' });
      return;
    }

    const wallet = await Wallet.findOne({ userId, currency: currency.toUpperCase() });
    if (!wallet) {
      res.status(404).json({ error: `Wallet for currency ${currency} not found` });
      return;
    }

    // Save as a pending deposit in the Deposit collection
    const depositReq = new Deposit({
      userId,
      walletId: wallet._id,
      currency: currency.toUpperCase(),
      amount: mongoose.Types.Decimal128.fromString(amount.toString()),
      fee: mongoose.Types.Decimal128.fromString('0.00'),
      status: 'pending',
      screenshotUrl: screenshotUrl || 'https://via.placeholder.com/600x400.png?text=Mock+Screenshot',
    });

    await depositReq.save();

    await Notification.create({
      userId,
      title: 'Deposit Request Submitted',
      message: `Your deposit request of ${amount} ${currency} is pending verification.`,
      type: 'info',
    });

    await logUserActivity(userId!, `DEPOSIT_REQUESTED_${currency}`, req);

    res.status(201).json({
      message: 'Deposit request submitted successfully. Waiting for admin approval.',
      transaction: depositReq,
    });
  } catch (error) {
    res.status(500).json({ error: 'Deposit submission failed.' });
  }
};

// Admin: approve/reject deposit requests
export const verifyDeposit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { transactionId } = req.params;
    const { action, feedback } = req.body; // action: 'approve' or 'reject'

    const depositReq = await Deposit.findById(transactionId).session(session);
    if (!depositReq || depositReq.status !== 'pending') {
      res.status(404).json({ error: 'Pending deposit request not found' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const wallet = await Wallet.findById(depositReq.walletId).session(session);
    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    if (action === 'approve') {
      depositReq.status = 'approved';
      // Credit to Deposit Wallet Balance
      const currentDepositBal = Number(wallet.depositBalance.toString());
      const depositAmt = Number(depositReq.amount.toString());
      wallet.depositBalance = mongoose.Types.Decimal128.fromString((currentDepositBal + depositAmt).toString());
      
      // Create ledger transaction
      const ledgerTxn = new Transaction({
        userId: depositReq.userId,
        walletId: depositReq.walletId,
        type: 'deposit',
        currency: depositReq.currency,
        amount: mongoose.Types.Decimal128.fromString(depositAmt.toString()),
        fee: mongoose.Types.Decimal128.fromString('0.00'),
        status: 'completed',
        metadata: { screenshotUrl: depositReq.screenshotUrl }
      });
      await ledgerTxn.save({ session });

      await Notification.create({
        userId: depositReq.userId,
        title: 'Deposit Verified',
        message: `Your deposit of ${depositAmt} ${depositReq.currency} has been approved and credited to your Deposit Wallet.`,
        type: 'success',
      });
    } else {
      depositReq.status = 'rejected';

      await Notification.create({
        userId: depositReq.userId,
        title: 'Deposit Rejected',
        message: `Your deposit of ${depositReq.amount.toString()} ${depositReq.currency} was rejected. Reason: ${feedback || 'No feedback provided'}`,
        type: 'warning',
      });
    }

    await depositReq.save({ session });
    await wallet.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: `Deposit request successfully ${action}d` });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to update deposit verification.' });
  }
};

// Retrieve deposit requests (for Admin console)
export const getDepositRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requests = await Deposit.find({})
      .populate('userId', 'email firstName lastName')
      .sort({ createdAt: -1 });
    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve deposit requests.' });
  }
};

// Retrieve withdrawal requests (for Admin console)
export const getWithdrawalRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requests = await Withdrawal.find({})
      .populate('userId', 'email firstName lastName')
      .sort({ createdAt: -1 });
    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve withdrawal requests.' });
  }
};

// Retrieve Transaction history for the user (Ledger)
export const getTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { type } = req.query;

    const filter: any = { userId };
    if (type) {
      filter.type = type;
    }

    const list = await Transaction.find(filter).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ transactions: list });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction history.' });
  }
};

// Retrieve User's Deposit History (including pending)
export const getUserDeposits = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const requests = await Deposit.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deposit history.' });
  }
};

// Retrieve User's Withdrawal History (including pending)
export const getUserWithdrawals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const requests = await Withdrawal.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch withdrawal history.' });
  }
};

// Mock Trade System (converting from one currency to another using exchange rates)
export const trade = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user?.id;
    const { fromCurrency, toCurrency, amount } = req.body; // trading 'amount' from Main Wallet

    if (fromCurrency === toCurrency) {
      res.status(400).json({ error: 'Cannot trade same currencies' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const sourceWallet = await Wallet.findOne({ userId, currency: fromCurrency }).session(session);
    if (!sourceWallet || Number(sourceWallet.mainBalance.toString()) < amount) {
      res.status(400).json({ error: `Insufficient ${fromCurrency} Main Wallet balance` });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Get Target wallet or create one
    let targetWallet = await Wallet.findOne({ userId, currency: toCurrency }).session(session);
    if (!targetWallet) {
      const prefix = toCurrency === 'BTC' ? 'bc1' : toCurrency === 'ETH' || toCurrency === 'USDT' ? '0x' : 'usd_';
      const address = prefix + crypto.randomUUID().replace(/-/g, '').substring(0, 40);
      targetWallet = new Wallet({
        userId,
        currency: toCurrency,
        mainBalance: 0.00,
        depositBalance: 0.00,
        earningsBalance: 0.00,
        withdrawalBalance: 0.00,
        lockedBalance: 0.00,
        depositAddress: address,
      });
      await targetWallet.save({ session });
    }

    const rate = getExchangeRate(fromCurrency, toCurrency);
    const targetAmount = amount * rate;
    const fee = amount * 0.001; // 0.1% trade fee in source currency
    const finalDebitAmount = amount + fee;

    if (Number(sourceWallet.mainBalance.toString()) < finalDebitAmount) {
      res.status(400).json({ error: 'Insufficient balance to cover trade amount plus 0.1% fee' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Update mainBalances
    const sourceBal = Number(sourceWallet.mainBalance.toString());
    const targetBal = Number(targetWallet.mainBalance.toString());

    sourceWallet.mainBalance = mongoose.Types.Decimal128.fromString((sourceBal - finalDebitAmount).toString());
    targetWallet.mainBalance = mongoose.Types.Decimal128.fromString((targetBal + targetAmount).toString());

    await sourceWallet.save({ session });
    await targetWallet.save({ session });

    // Save Trade transactions
    const txn = new Transaction({
      userId,
      walletId: sourceWallet._id,
      type: 'trade',
      currency: fromCurrency,
      amount: mongoose.Types.Decimal128.fromString((-finalDebitAmount).toString()),
      fee: mongoose.Types.Decimal128.fromString(fee.toString()),
      status: 'completed',
      metadata: { tradedFor: toCurrency, exchangeRate: rate, receivedAmount: targetAmount },
    });
    await txn.save({ session });

    const txnReceive = new Transaction({
      userId,
      walletId: targetWallet._id,
      type: 'trade',
      currency: toCurrency,
      amount: mongoose.Types.Decimal128.fromString(targetAmount.toString()),
      fee: mongoose.Types.Decimal128.fromString('0.00'),
      status: 'completed',
      metadata: { tradedFrom: fromCurrency, exchangeRate: rate },
    });
    await txnReceive.save({ session });

    await Notification.create({
      userId,
      title: 'Trade Executed',
      message: `Swapped ${amount} ${fromCurrency} for ${targetAmount.toFixed(6)} ${toCurrency}.`,
      type: 'success',
    });

    await session.commitTransaction();
    session.endSession();

    await logUserActivity(userId!, `TRADE_${fromCurrency}_TO_${toCurrency}`, req);

    res.status(200).json({
      message: 'Trade completed successfully',
      exchangedAmount: targetAmount,
      fee,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Trade failed. Please try again.' });
  }
};
