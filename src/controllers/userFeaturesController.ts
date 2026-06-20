import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Jackpot } from '../models/Jackpot';
import { Salary } from '../models/Salary';
import { SupportTicket } from '../models/SupportTicket';
import { Announcement } from '../models/Announcement';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import mongoose from 'mongoose';

// ==========================
// JACKPOT SYSTEM
// ==========================
export const getActiveJackpot = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const activeJackpot = await Jackpot.findOne({ status: 'open' }).sort({ round: -1 });
    const pastJackpots = await Jackpot.find({ status: 'drawn' })
      .populate('winnerId', 'firstName lastName')
      .sort({ drawnAt: -1 })
      .limit(10);

    res.json({
      active: activeJackpot,
      history: pastJackpots,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jackpots' });
  }
};

export const participateJackpot = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user?.id;
    if (!userId) throw new Error('Unauthenticated');

    const activeJackpot = await Jackpot.findOne({ status: 'open' }).session(session);
    if (!activeJackpot) {
      res.status(400).json({ error: 'No active jackpot available' });
      await session.abortTransaction();
      return;
    }

    if (activeJackpot.participants.includes(new mongoose.Types.ObjectId(userId))) {
      res.status(400).json({ error: 'You are already participating in this round' });
      await session.abortTransaction();
      return;
    }

    // Example logic: Cost is 10 USDT from Main Wallet to enter
    const ENTRY_FEE = 10;
    const wallet = await Wallet.findOne({ userId, currency: 'USDT' }).session(session);
    
    if (!wallet || Number(wallet.mainBalance.toString()) < ENTRY_FEE) {
      res.status(400).json({ error: `Insufficient USDT balance. ${ENTRY_FEE} USDT required.` });
      await session.abortTransaction();
      return;
    }

    const currentBal = Number(wallet.mainBalance.toString());
    wallet.mainBalance = mongoose.Types.Decimal128.fromString((currentBal - ENTRY_FEE).toString());
    await wallet.save({ session });

    // Add to pool
    const currentPool = Number(activeJackpot.poolAmount.toString());
    activeJackpot.poolAmount = mongoose.Types.Decimal128.fromString((currentPool + ENTRY_FEE).toString());
    activeJackpot.participants.push(new mongoose.Types.ObjectId(userId));
    await activeJackpot.save({ session });

    await Transaction.create([{
      userId,
      walletId: wallet._id,
      type: 'withdrawal',
      currency: 'USDT',
      amount: mongoose.Types.Decimal128.fromString(ENTRY_FEE.toString()),
      fee: mongoose.Types.Decimal128.fromString('0'),
      status: 'completed',
      metadata: { description: `GMC Jackpot Round ${activeJackpot.round} Entry Fee` }
    }], { session });

    await session.commitTransaction();
    res.json({ message: 'Successfully joined the jackpot!', jackpot: activeJackpot });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: 'Failed to participate' });
  } finally {
    session.endSession();
  }
};

// ==========================
// SALARY SYSTEM
// ==========================
export const getMySalaryInfo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const salary = await Salary.findOne({ userId, status: 'active' });
    const salaryHistory = await Transaction.find({
      userId,
      type: 'earnings',
      'metadata.source': 'salary'
    }).sort({ createdAt: -1 });

    res.json({
      salary,
      history: salaryHistory,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch salary info' });
  }
};

// ==========================
// SUPPORT SYSTEM
// ==========================
export const getMyTickets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const tickets = await SupportTicket.find({ userId }).sort({ updatedAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

export const createTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { subject, message } = req.body;

    const ticket = await SupportTicket.create({
      userId,
      subject,
      status: 'open',
      replies: [{ sender: 'user', message }]
    });

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

export const replyTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { message } = req.body;

    const ticket = await SupportTicket.findOne({ _id: id, userId });
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    ticket.replies.push({ sender: 'user', message, createdAt: new Date() });
    ticket.status = 'open'; // Reopen if closed
    await ticket.save();

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reply to ticket' });
  }
};

export const getTicketDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const ticket = await SupportTicket.findOne({ _id: id, userId });
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
};

// ==========================
// ANNOUNCEMENTS
// ==========================
export const getActiveAnnouncements = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const announcements = await Announcement.find({ status: 'published' }).sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};
