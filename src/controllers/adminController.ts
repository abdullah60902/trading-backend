import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Admin } from '../models/Admin';
import { Transaction } from '../models/Transaction';
import { Wallet } from '../models/Wallet';
import { StakingPlan } from '../models/StakingPlan';
import { AdminLog } from '../models/AdminLog';
import { SupportTicket } from '../models/SupportTicket';
import { Announcement } from '../models/Announcement';
import { Banner } from '../models/Banner';
import { Jackpot } from '../models/Jackpot';
import { Salary } from '../models/Salary';
import mongoose from 'mongoose';
import { emitToUser, emitToAll } from '../utils/socket';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { env } from '../config/env';

// Admin Login
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }

    if (admin.status === 'suspended') {
      res.status(403).json({ error: 'Admin account suspended' });
      return;
    }

    // Generate Tokens
    const accessToken = generateAccessToken({
      userId: admin._id.toString(),
      role: admin.role,
      is2faVerified: admin.twoFactorEnabled,
    });

    const refreshToken = generateRefreshToken({ userId: admin._id.toString() });

    admin.refreshToken = refreshToken;
    await admin.save();

    await AdminLog.create({
      adminId: admin._id,
      action: 'admin_login',
      ipAddress: req.ip,
      details: `Admin ${admin.email} logged in`,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        isMobileVerified: false,
        twoFactorEnabled: admin.twoFactorEnabled,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Admin login failed' });
  }
};

// Dashboard Stats
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });

    // Aggregate transactions
    const txStats = await Transaction.aggregate([
      {
        $group: {
          _id: { type: '$type', status: '$status' },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalEarnings = 0;

    txStats.forEach((stat) => {
      if (stat._id.type === 'deposit' && stat._id.status === 'completed') {
        totalDeposits += parseFloat(stat.totalAmount.toString());
      }
      if (stat._id.type === 'withdrawal' && stat._id.status === 'completed') {
        totalWithdrawals += parseFloat(stat.totalAmount.toString());
      }
      if (stat._id.type === 'earnings' && stat._id.status === 'completed') {
        totalEarnings += parseFloat(stat.totalAmount.toString());
      }
    });

    const totalRevenue = totalDeposits - totalWithdrawals - totalEarnings;
    const activeStaking = await StakingPlan.countDocuments({ status: 'active' });
    const mlmNetworkSize = await User.countDocuments({ referredBy: { $exists: true, $ne: null } });
    const totalJackpotRounds = await Jackpot.countDocuments();
    const activeJackpotCount = await Jackpot.countDocuments({ status: 'open' });
    const activeJackpot = await Jackpot.findOne({ status: 'open' });
    const activeJackpotPool = activeJackpot ? parseFloat(activeJackpot.poolAmount.toString()) : 0;
    const activeJackpotParticipants = activeJackpot ? activeJackpot.participants.length : 0;

    res.json({
      totalUsers,
      activeUsers,
      totalDeposits,
      totalWithdrawals,
      totalEarnings,
      totalRevenue,
      activeStakingPlans: activeStaking,
      mlmNetworkSize,
      totalJackpotRounds,
      activeJackpotCount,
      activeJackpotPool,
      activeJackpotParticipants,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard stats', error });
  }
};

// User Management
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const query: any = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password -twoFactorSecret')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
};

export const updateUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await User.findByIdAndUpdate(id, { status }, { new: true }).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user!.id,
      action: `update_user_status`,
      targetUserId: user._id,
      ipAddress: req.ip,
      details: `Updated status to ${status}`,
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error });
  }
};

// Transaction Management (Deposits & Withdrawals)
export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string; // 'deposit' | 'withdrawal'
    const status = req.query.status as string;

    const query: any = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .populate('userId', 'email firstName lastName')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error });
  }
};

export const processTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' | 'reject'

    const transaction = await Transaction.findById(id).session(session);
    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    if (transaction.status !== 'pending') {
      res.status(400).json({ message: 'Transaction is not pending' });
      return;
    }

    const wallet = await Wallet.findOne({ userId: transaction.userId }).session(session);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (action === 'approve') {
      transaction.status = 'completed';
      
      if (transaction.type === 'deposit') {
        const currentBalance = parseFloat(wallet.mainBalance.toString());
        const amount = parseFloat(transaction.amount.toString());
        wallet.mainBalance = mongoose.Types.Decimal128.fromString((currentBalance + amount).toString());
      } else if (transaction.type === 'withdrawal') {
        const currentWithdrawn = parseFloat(wallet.withdrawalBalance.toString());
        const amount = parseFloat(transaction.amount.toString());
        wallet.withdrawalBalance = mongoose.Types.Decimal128.fromString((currentWithdrawn + amount).toString());
      }
      
      await wallet.save({ session });
    } else if (action === 'reject') {
      transaction.status = 'rejected';
      
      if (transaction.type === 'withdrawal') {
        // Refund to main balance
        const currentBalance = parseFloat(wallet.mainBalance.toString());
        const amount = parseFloat(transaction.amount.toString());
        const fee = parseFloat(transaction.fee.toString());
        wallet.mainBalance = mongoose.Types.Decimal128.fromString((currentBalance + amount + fee).toString());
        await wallet.save({ session });
      }
    } else {
      res.status(400).json({ message: 'Invalid action' });
      return;
    }

    await transaction.save({ session });

    await AdminLog.create([{
      adminId: req.user!.id,
      action: `${action}_transaction`,
      targetUserId: transaction.userId,
      ipAddress: req.ip,
      details: `${action} transaction ${transaction._id}`,
    }], { session });

    await session.commitTransaction();

    // Socket Event
    emitToUser(transaction.userId.toString(), 'notification', {
      type: action === 'approve' ? 'transaction_approved' : 'transaction_rejected',
      title: `${transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'} ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      message: `Your ${transaction.type} of ${transaction.amount} ${transaction.currency} was ${action}d.`,
      date: new Date()
    });

    res.json({ message: `Transaction ${action}d successfully`, transaction });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Error processing transaction', error });
  } finally {
    session.endSession();
  }
};

// Support Management
export const getSupportTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const tickets = await SupportTicket.find()
      .populate('userId', 'email firstName lastName')
      .sort({ updatedAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tickets', error });
  }
};

export const replySupportTicket = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    ticket.replies.push({
      sender: 'admin',
      message,
      createdAt: new Date(),
    });
    ticket.status = 'replied';
    await ticket.save();

    await AdminLog.create({
      adminId: req.user!.id,
      action: 'reply_support_ticket',
      targetUserId: ticket.userId,
      ipAddress: req.ip,
      details: `Replied to support ticket ${ticket._id}`,
    });

    // Socket Event
    emitToUser(ticket.userId.toString(), 'notification', {
      type: 'ticket_reply',
      title: 'Support Ticket Reply',
      message: `Admin replied to your ticket: ${ticket.subject}`,
      date: new Date()
    });

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error replying to ticket', error });
  }
};

// Announcement Management
export const getAnnouncements = async (req: Request, res: Response): Promise<void> => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching announcements', error });
  }
};

export const createAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, content } = req.body;
    const announcement = await Announcement.create({ title, content });

    await AdminLog.create({
      adminId: req.user!.id,
      action: 'create_announcement',
      ipAddress: req.ip,
      details: `Created announcement '${title}'`,
    });

    // Socket Event
    emitToAll('notification', {
      type: 'announcement',
      title: 'New Announcement',
      message: title,
      date: new Date()
    });

    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: 'Error creating announcement', error });
  }
};

export const updateAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, status } = req.body;
    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { title, content, status },
      { new: true }
    );
    if (!announcement) {
      res.status(404).json({ message: 'Announcement not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user!.id,
      action: 'update_announcement',
      ipAddress: req.ip,
      details: `Updated announcement ${announcement._id}`,
    });

    res.json(announcement);
  } catch (error) {
    res.status(500).json({ message: 'Error updating announcement', error });
  }
};

export const deleteAnnouncement = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);

    await AdminLog.create({
      adminId: req.user!.id,
      action: 'delete_announcement',
      ipAddress: req.ip,
      details: `Deleted announcement ${id}`,
    });

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting announcement', error });
  }
};

// Banner Management
export const getBanners = async (req: Request, res: Response): Promise<void> => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching banners', error });
  }
};

export const createBanner = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, imageUrl, linkUrl, status } = req.body;
    const banner = await Banner.create({ title, imageUrl, linkUrl, status });

    await AdminLog.create({
      adminId: req.user!.id,
      action: 'create_banner',
      ipAddress: req.ip,
      details: `Created banner '${title}'`,
    });

    res.status(201).json(banner);
  } catch (error) {
    res.status(500).json({ message: 'Error creating banner', error });
  }
};

export const updateBanner = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, imageUrl, linkUrl, status } = req.body;
    const banner = await Banner.findByIdAndUpdate(
      id,
      { title, imageUrl, linkUrl, status },
      { new: true }
    );
    if (!banner) {
      res.status(404).json({ message: 'Banner not found' });
      return;
    }

    await AdminLog.create({
      adminId: req.user!.id,
      action: 'update_banner',
      ipAddress: req.ip,
      details: `Updated banner ${banner._id}`,
    });

    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: 'Error updating banner', error });
  }
};

export const deleteBanner = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await Banner.findByIdAndDelete(id);

    await AdminLog.create({
      adminId: req.user!.id,
      action: 'delete_banner',
      ipAddress: req.ip,
      details: `Deleted banner ${id}`,
    });

    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting banner', error });
  }
};

// Jackpot Management
export const getJackpots = async (req: Request, res: Response): Promise<void> => {
  try {
    const jackpots = await Jackpot.find()
      .populate('winnerId', 'email firstName lastName')
      .sort({ createdAt: -1 });
    res.json(jackpots);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching jackpots', error });
  }
};

export const drawJackpot = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const jackpot = await Jackpot.findById(id).session(session);

    if (!jackpot) {
      res.status(404).json({ message: 'Jackpot not found' });
      return;
    }

    if (jackpot.status !== 'open') {
      res.status(400).json({ message: 'Jackpot is already drawn or closed' });
      return;
    }

    if (!jackpot.participants || jackpot.participants.length === 0) {
      res.status(400).json({ message: 'No participants in this jackpot' });
      return;
    }

    // Random winner selection
    const randomIndex = Math.floor(Math.random() * jackpot.participants.length);
    const winnerId = jackpot.participants[randomIndex];

    jackpot.status = 'drawn';
    jackpot.winnerId = winnerId;
    jackpot.drawnAt = new Date();

    await jackpot.save({ session });

    // Credit winner's wallet
    const wallet = await Wallet.findOne({ userId: winnerId }).session(session);
    if (wallet) {
      const currentBalance = parseFloat(wallet.mainBalance.toString());
      const reward = parseFloat(jackpot.poolAmount.toString());
      wallet.mainBalance = mongoose.Types.Decimal128.fromString((currentBalance + reward).toString());
      await wallet.save({ session });

      // Create transaction record
      await Transaction.create([{
        userId: winnerId,
        walletId: wallet._id,
        type: 'earnings',
        currency: 'USDT',
        amount: jackpot.poolAmount,
        fee: mongoose.Types.Decimal128.fromString('0'),
        status: 'completed',
        metadata: { source: 'jackpot', jackpotId: jackpot._id }
      }], { session });
    }

    // Log admin action
    await AdminLog.create([{
      adminId: req.user!.id,
      action: 'draw_jackpot',
      details: `Drew jackpot ${jackpot.round}, Winner: ${winnerId}`,
      ipAddress: req.ip
    }], { session });

    await session.commitTransaction();

    // Socket Event
    emitToUser(winnerId.toString(), 'notification', {
      type: 'jackpot_won',
      title: 'Jackpot Winner!',
      message: `Congratulations! You won the jackpot pool of ${jackpot.poolAmount} USDT!`,
      date: new Date()
    });

    res.json({ message: 'Jackpot drawn successfully', jackpot });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Error drawing jackpot', error });
  } finally {
    session.endSession();
  }
};

// Salary Management
export const getSalaries = async (req: Request, res: Response): Promise<void> => {
  try {
    const salaries = await Salary.find()
      .populate('userId', 'email firstName lastName')
      .sort({ createdAt: -1 });
    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching salaries', error });
  }
};

export const paySalary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const salary = await Salary.findById(id).session(session);

    if (!salary) {
      res.status(404).json({ message: 'Salary record not found' });
      return;
    }

    if (salary.status !== 'active') {
      res.status(400).json({ message: 'Salary is inactive' });
      return;
    }

    const wallet = await Wallet.findOne({ userId: salary.userId }).session(session);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Credit user's wallet
    const currentBalance = parseFloat(wallet.mainBalance.toString());
    const amount = parseFloat(salary.monthlyAmount.toString());
    wallet.mainBalance = mongoose.Types.Decimal128.fromString((currentBalance + amount).toString());
    await wallet.save({ session });

    salary.lastPaidAt = new Date();
    await salary.save({ session });

    // Create transaction record
    await Transaction.create([{
      userId: salary.userId,
      walletId: wallet._id,
      type: 'earnings',
      currency: salary.currency,
      amount: salary.monthlyAmount,
      fee: mongoose.Types.Decimal128.fromString('0'),
      status: 'completed',
      metadata: { source: 'salary', salaryId: salary._id }
    }], { session });

    // Log admin action
    await AdminLog.create([{
      adminId: req.user!.id,
      action: 'pay_salary',
      targetUserId: salary.userId,
      details: `Paid salary of ${salary.monthlyAmount} ${salary.currency}`,
      ipAddress: req.ip
    }], { session });

    await session.commitTransaction();

    // Socket Event
    emitToUser(salary.userId.toString(), 'notification', {
      type: 'salary_received',
      title: 'Salary Received',
      message: `Your monthly salary of ${salary.monthlyAmount} ${salary.currency} has been credited.`,
      date: new Date()
    });

    res.json({ message: 'Salary paid successfully', salary });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Error paying salary', error });
  } finally {
    session.endSession();
  }
};

// Admin Logs
export const getAdminLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const logs = await AdminLog.find()
      .populate('adminId', 'email firstName lastName')
      .populate('targetUserId', 'email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await AdminLog.countDocuments();

    res.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin logs', error });
  }
};

// Staking Management
export const getAllStakingPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const plans = await StakingPlan.find()
      .populate('userId', 'email firstName lastName')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await StakingPlan.countDocuments();

    res.json({
      plans,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching staking plans', error });
  }
};

// MLM Management
export const getMLMStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const topReferrers = await User.aggregate([
      { $match: { referredBy: { $exists: true, $ne: null } } },
      { $group: { _id: '$referredBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 1, count: 1, email: '$user.email', firstName: '$user.firstName', lastName: '$user.lastName' } }
    ]);

    const totalNetworkSize = await User.countDocuments({ referredBy: { $exists: true, $ne: null } });

    res.json({
      topReferrers,
      totalNetworkSize,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching MLM stats', error });
  }
};

// Create a new Jackpot round
export const createJackpotRound = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { round, poolAmount } = req.body;

    // Check if there is already an open jackpot round
    const existingOpen = await Jackpot.findOne({ status: 'open' });
    if (existingOpen) {
      res.status(400).json({ message: 'There is already an open jackpot round active' });
      return;
    }

    const nextRound = round || ((await Jackpot.findOne().sort({ round: -1 }))?.round || 0) + 1;

    const jackpot = await Jackpot.create({
      round: nextRound,
      poolAmount: poolAmount || 0,
      status: 'open',
      participants: []
    });

    // Log admin action
    await AdminLog.create({
      adminId: req.user!.id,
      action: 'create_jackpot',
      details: `Created jackpot round ${nextRound} with initial pool ${poolAmount || 0}`,
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'Jackpot round created successfully', jackpot });
  } catch (error) {
    res.status(500).json({ message: 'Error creating jackpot round', error });
  }
};

// Create or update Salary config for a user
export const saveSalaryConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId, email, monthlyAmount, currency, status } = req.body;

    let targetUser = null;
    if (userId) {
      targetUser = await User.findById(userId);
    } else if (email) {
      targetUser = await User.findOne({ email });
    }

    if (!targetUser) {
      res.status(404).json({ message: 'User not found. Check ID/email.' });
      return;
    }

    // Check if salary record already exists
    let salary = await Salary.findOne({ userId: targetUser._id });
    if (salary) {
      salary.monthlyAmount = monthlyAmount;
      salary.currency = currency || 'USDT';
      salary.status = status || 'active';
      await salary.save();
    } else {
      salary = await Salary.create({
        userId: targetUser._id,
        monthlyAmount,
        currency: currency || 'USDT',
        status: status || 'active'
      });
    }

    // Log admin action
    await AdminLog.create({
      adminId: req.user!.id,
      action: 'configure_salary',
      targetUserId: targetUser._id,
      details: `Configured monthly salary to ${monthlyAmount} ${currency || 'USDT'} (${status || 'active'})`,
      ipAddress: req.ip
    });

    res.status(200).json({ message: 'Salary configuration saved successfully', salary });
  } catch (error) {
    res.status(500).json({ message: 'Error saving salary configuration', error });
  }
};

