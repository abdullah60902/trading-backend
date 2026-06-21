"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSalaryConfig = exports.createJackpotRound = exports.getMLMStats = exports.getAllStakingPlans = exports.getAdminLogs = exports.paySalary = exports.getSalaries = exports.drawJackpot = exports.getJackpots = exports.deleteBanner = exports.updateBanner = exports.createBanner = exports.getBanners = exports.deleteAnnouncement = exports.updateAnnouncement = exports.createAnnouncement = exports.getAnnouncements = exports.replySupportTicket = exports.getSupportTickets = exports.processTransaction = exports.getTransactions = exports.updateUserStatus = exports.getUsers = exports.getDashboardStats = exports.adminLogin = void 0;
const User_1 = require("../models/User");
const Admin_1 = require("../models/Admin");
const Transaction_1 = require("../models/Transaction");
const Wallet_1 = require("../models/Wallet");
const StakingPlan_1 = require("../models/StakingPlan");
const AdminLog_1 = require("../models/AdminLog");
const SupportTicket_1 = require("../models/SupportTicket");
const Announcement_1 = require("../models/Announcement");
const Banner_1 = require("../models/Banner");
const Jackpot_1 = require("../models/Jackpot");
const Salary_1 = require("../models/Salary");
const mongoose_1 = __importDefault(require("mongoose"));
const socket_1 = require("../utils/socket");
const jwt_1 = require("../utils/jwt");
const env_1 = require("../config/env");
// Admin Login
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin_1.Admin.findOne({ email });
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
        const accessToken = (0, jwt_1.generateAccessToken)({
            userId: admin._id.toString(),
            role: admin.role,
            is2faVerified: admin.twoFactorEnabled,
        });
        const refreshToken = (0, jwt_1.generateRefreshToken)({ userId: admin._id.toString() });
        admin.refreshToken = refreshToken;
        await admin.save();
        await AdminLog_1.AdminLog.create({
            adminId: admin._id,
            action: 'admin_login',
            ipAddress: req.ip,
            details: `Admin ${admin.email} logged in`,
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: env_1.env.NODE_ENV === 'production',
            sameSite: env_1.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
    }
    catch (error) {
        res.status(500).json({ error: 'Admin login failed' });
    }
};
exports.adminLogin = adminLogin;
// Dashboard Stats
const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User_1.User.countDocuments();
        const activeUsers = await User_1.User.countDocuments({ status: 'active' });
        // Aggregate transactions
        const txStats = await Transaction_1.Transaction.aggregate([
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
        const activeStaking = await StakingPlan_1.StakingPlan.countDocuments({ status: 'active' });
        const mlmNetworkSize = await User_1.User.countDocuments({ referredBy: { $exists: true, $ne: null } });
        const totalJackpotRounds = await Jackpot_1.Jackpot.countDocuments();
        const activeJackpotCount = await Jackpot_1.Jackpot.countDocuments({ status: 'open' });
        const activeJackpot = await Jackpot_1.Jackpot.findOne({ status: 'open' });
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
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard stats', error });
    }
};
exports.getDashboardStats = getDashboardStats;
// User Management
const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const query = {};
        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
            ];
        }
        const users = await User_1.User.find(query)
            .select('-password -twoFactorSecret')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = await User_1.User.countDocuments(query);
        res.json({
            users,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
};
exports.getUsers = getUsers;
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const user = await User_1.User.findByIdAndUpdate(id, { status }, { new: true }).select('-password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        await AdminLog_1.AdminLog.create({
            adminId: req.user.id,
            action: `update_user_status`,
            targetUserId: user._id,
            ipAddress: req.ip,
            details: `Updated status to ${status}`,
        });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating user', error });
    }
};
exports.updateUserStatus = updateUserStatus;
// Transaction Management (Deposits & Withdrawals)
const getTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const type = req.query.type; // 'deposit' | 'withdrawal'
        const status = req.query.status;
        const query = {};
        if (type)
            query.type = type;
        if (status)
            query.status = status;
        const transactions = await Transaction_1.Transaction.find(query)
            .populate('userId', 'email firstName lastName')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = await Transaction_1.Transaction.countDocuments(query);
        res.json({
            transactions,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching transactions', error });
    }
};
exports.getTransactions = getTransactions;
const processTransaction = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const { action } = req.body; // 'approve' | 'reject'
        const transaction = await Transaction_1.Transaction.findById(id).session(session);
        if (!transaction) {
            res.status(404).json({ message: 'Transaction not found' });
            return;
        }
        if (transaction.status !== 'pending') {
            res.status(400).json({ message: 'Transaction is not pending' });
            return;
        }
        const wallet = await Wallet_1.Wallet.findOne({ userId: transaction.userId }).session(session);
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        if (action === 'approve') {
            transaction.status = 'completed';
            if (transaction.type === 'deposit') {
                const currentBalance = parseFloat(wallet.mainBalance.toString());
                const amount = parseFloat(transaction.amount.toString());
                wallet.mainBalance = mongoose_1.default.Types.Decimal128.fromString((currentBalance + amount).toString());
            }
            else if (transaction.type === 'withdrawal') {
                const currentWithdrawn = parseFloat(wallet.withdrawalBalance.toString());
                const amount = parseFloat(transaction.amount.toString());
                wallet.withdrawalBalance = mongoose_1.default.Types.Decimal128.fromString((currentWithdrawn + amount).toString());
            }
            await wallet.save({ session });
        }
        else if (action === 'reject') {
            transaction.status = 'rejected';
            if (transaction.type === 'withdrawal') {
                // Refund to main balance
                const currentBalance = parseFloat(wallet.mainBalance.toString());
                const amount = parseFloat(transaction.amount.toString());
                const fee = parseFloat(transaction.fee.toString());
                wallet.mainBalance = mongoose_1.default.Types.Decimal128.fromString((currentBalance + amount + fee).toString());
                await wallet.save({ session });
            }
        }
        else {
            res.status(400).json({ message: 'Invalid action' });
            return;
        }
        await transaction.save({ session });
        await AdminLog_1.AdminLog.create([{
                adminId: req.user.id,
                action: `${action}_transaction`,
                targetUserId: transaction.userId,
                ipAddress: req.ip,
                details: `${action} transaction ${transaction._id}`,
            }], { session });
        await session.commitTransaction();
        // Socket Event
        (0, socket_1.emitToUser)(transaction.userId.toString(), 'notification', {
            type: action === 'approve' ? 'transaction_approved' : 'transaction_rejected',
            title: `${transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'} ${action === 'approve' ? 'Approved' : 'Rejected'}`,
            message: `Your ${transaction.type} of ${transaction.amount} ${transaction.currency} was ${action}d.`,
            date: new Date()
        });
        res.json({ message: `Transaction ${action}d successfully`, transaction });
    }
    catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: 'Error processing transaction', error });
    }
    finally {
        session.endSession();
    }
};
exports.processTransaction = processTransaction;
// Support Management
const getSupportTickets = async (req, res) => {
    try {
        const tickets = await SupportTicket_1.SupportTicket.find()
            .populate('userId', 'email firstName lastName')
            .sort({ updatedAt: -1 });
        res.json(tickets);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching tickets', error });
    }
};
exports.getSupportTickets = getSupportTickets;
const replySupportTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const ticket = await SupportTicket_1.SupportTicket.findById(id);
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
        await AdminLog_1.AdminLog.create({
            adminId: req.user.id,
            action: 'reply_support_ticket',
            targetUserId: ticket.userId,
            ipAddress: req.ip,
            details: `Replied to support ticket ${ticket._id}`,
        });
        // Socket Event
        (0, socket_1.emitToUser)(ticket.userId.toString(), 'notification', {
            type: 'ticket_reply',
            title: 'Support Ticket Reply',
            message: `Admin replied to your ticket: ${ticket.subject}`,
            date: new Date()
        });
        res.json(ticket);
    }
    catch (error) {
        res.status(500).json({ message: 'Error replying to ticket', error });
    }
};
exports.replySupportTicket = replySupportTicket;
// Announcement Management
const getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement_1.Announcement.find().sort({ createdAt: -1 });
        res.json(announcements);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching announcements', error });
    }
};
exports.getAnnouncements = getAnnouncements;
const createAnnouncement = async (req, res) => {
    try {
        const { title, content } = req.body;
        const announcement = await Announcement_1.Announcement.create({ title, content });
        await AdminLog_1.AdminLog.create({
            adminId: req.user.id,
            action: 'create_announcement',
            ipAddress: req.ip,
            details: `Created announcement '${title}'`,
        });
        // Socket Event
        (0, socket_1.emitToAll)('notification', {
            type: 'announcement',
            title: 'New Announcement',
            message: title,
            date: new Date()
        });
        res.status(201).json(announcement);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating announcement', error });
    }
};
exports.createAnnouncement = createAnnouncement;
const updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, status } = req.body;
        const announcement = await Announcement_1.Announcement.findByIdAndUpdate(id, { title, content, status }, { new: true });
        if (!announcement) {
            res.status(404).json({ message: 'Announcement not found' });
            return;
        }
        await AdminLog_1.AdminLog.create({
            adminId: req.user.id,
            action: 'update_announcement',
            ipAddress: req.ip,
            details: `Updated announcement ${announcement._id}`,
        });
        res.json(announcement);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating announcement', error });
    }
};
exports.updateAnnouncement = updateAnnouncement;
const deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        await Announcement_1.Announcement.findByIdAndDelete(id);
        await AdminLog_1.AdminLog.create({
            adminId: req.user.id,
            action: 'delete_announcement',
            ipAddress: req.ip,
            details: `Deleted announcement ${id}`,
        });
        res.json({ message: 'Announcement deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting announcement', error });
    }
};
exports.deleteAnnouncement = deleteAnnouncement;
// Banner Management
const getBanners = async (req, res) => {
    try {
        const banners = await Banner_1.Banner.find().sort({ createdAt: -1 });
        res.json(banners);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching banners', error });
    }
};
exports.getBanners = getBanners;
const createBanner = async (req, res) => {
    try {
        const { title, imageUrl, linkUrl, status } = req.body;
        const banner = await Banner_1.Banner.create({ title, imageUrl, linkUrl, status });
        await AdminLog_1.AdminLog.create({
            adminId: req.user.id,
            action: 'create_banner',
            ipAddress: req.ip,
            details: `Created banner '${title}'`,
        });
        res.status(201).json(banner);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating banner', error });
    }
};
exports.createBanner = createBanner;
const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, imageUrl, linkUrl, status } = req.body;
        const banner = await Banner_1.Banner.findByIdAndUpdate(id, { title, imageUrl, linkUrl, status }, { new: true });
        if (!banner) {
            res.status(404).json({ message: 'Banner not found' });
            return;
        }
        await AdminLog_1.AdminLog.create({
            adminId: req.user.id,
            action: 'update_banner',
            ipAddress: req.ip,
            details: `Updated banner ${banner._id}`,
        });
        res.json(banner);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating banner', error });
    }
};
exports.updateBanner = updateBanner;
const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        await Banner_1.Banner.findByIdAndDelete(id);
        await AdminLog_1.AdminLog.create({
            adminId: req.user.id,
            action: 'delete_banner',
            ipAddress: req.ip,
            details: `Deleted banner ${id}`,
        });
        res.json({ message: 'Banner deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting banner', error });
    }
};
exports.deleteBanner = deleteBanner;
// Jackpot Management
const getJackpots = async (req, res) => {
    try {
        const jackpots = await Jackpot_1.Jackpot.find()
            .populate('winnerId', 'email firstName lastName')
            .sort({ createdAt: -1 });
        res.json(jackpots);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching jackpots', error });
    }
};
exports.getJackpots = getJackpots;
const drawJackpot = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const jackpot = await Jackpot_1.Jackpot.findById(id).session(session);
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
        const wallet = await Wallet_1.Wallet.findOne({ userId: winnerId }).session(session);
        if (wallet) {
            const currentBalance = parseFloat(wallet.mainBalance.toString());
            const reward = parseFloat(jackpot.poolAmount.toString());
            wallet.mainBalance = mongoose_1.default.Types.Decimal128.fromString((currentBalance + reward).toString());
            await wallet.save({ session });
            // Create transaction record
            await Transaction_1.Transaction.create([{
                    userId: winnerId,
                    walletId: wallet._id,
                    type: 'earnings',
                    currency: 'USDT',
                    amount: jackpot.poolAmount,
                    fee: mongoose_1.default.Types.Decimal128.fromString('0'),
                    status: 'completed',
                    metadata: { source: 'jackpot', jackpotId: jackpot._id }
                }], { session });
        }
        // Log admin action
        await AdminLog_1.AdminLog.create([{
                adminId: req.user.id,
                action: 'draw_jackpot',
                details: `Drew jackpot ${jackpot.round}, Winner: ${winnerId}`,
                ipAddress: req.ip
            }], { session });
        await session.commitTransaction();
        // Socket Event
        (0, socket_1.emitToUser)(winnerId.toString(), 'notification', {
            type: 'jackpot_won',
            title: 'Jackpot Winner!',
            message: `Congratulations! You won the jackpot pool of ${jackpot.poolAmount} USDT!`,
            date: new Date()
        });
        res.json({ message: 'Jackpot drawn successfully', jackpot });
    }
    catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: 'Error drawing jackpot', error });
    }
    finally {
        session.endSession();
    }
};
exports.drawJackpot = drawJackpot;
// Salary Management
const getSalaries = async (req, res) => {
    try {
        const salaries = await Salary_1.Salary.find()
            .populate('userId', 'email firstName lastName')
            .sort({ createdAt: -1 });
        res.json(salaries);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching salaries', error });
    }
};
exports.getSalaries = getSalaries;
const paySalary = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const salary = await Salary_1.Salary.findById(id).session(session);
        if (!salary) {
            res.status(404).json({ message: 'Salary record not found' });
            return;
        }
        if (salary.status !== 'active') {
            res.status(400).json({ message: 'Salary is inactive' });
            return;
        }
        const wallet = await Wallet_1.Wallet.findOne({ userId: salary.userId }).session(session);
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        // Credit user's wallet
        const currentBalance = parseFloat(wallet.mainBalance.toString());
        const amount = parseFloat(salary.monthlyAmount.toString());
        wallet.mainBalance = mongoose_1.default.Types.Decimal128.fromString((currentBalance + amount).toString());
        await wallet.save({ session });
        salary.lastPaidAt = new Date();
        await salary.save({ session });
        // Create transaction record
        await Transaction_1.Transaction.create([{
                userId: salary.userId,
                walletId: wallet._id,
                type: 'earnings',
                currency: salary.currency,
                amount: salary.monthlyAmount,
                fee: mongoose_1.default.Types.Decimal128.fromString('0'),
                status: 'completed',
                metadata: { source: 'salary', salaryId: salary._id }
            }], { session });
        // Log admin action
        await AdminLog_1.AdminLog.create([{
                adminId: req.user.id,
                action: 'pay_salary',
                targetUserId: salary.userId,
                details: `Paid salary of ${salary.monthlyAmount} ${salary.currency}`,
                ipAddress: req.ip
            }], { session });
        await session.commitTransaction();
        // Socket Event
        (0, socket_1.emitToUser)(salary.userId.toString(), 'notification', {
            type: 'salary_received',
            title: 'Salary Received',
            message: `Your monthly salary of ${salary.monthlyAmount} ${salary.currency} has been credited.`,
            date: new Date()
        });
        res.json({ message: 'Salary paid successfully', salary });
    }
    catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: 'Error paying salary', error });
    }
    finally {
        session.endSession();
    }
};
exports.paySalary = paySalary;
// Admin Logs
const getAdminLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const logs = await AdminLog_1.AdminLog.find()
            .populate('adminId', 'email firstName lastName')
            .populate('targetUserId', 'email')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = await AdminLog_1.AdminLog.countDocuments();
        res.json({
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching admin logs', error });
    }
};
exports.getAdminLogs = getAdminLogs;
// Staking Management
const getAllStakingPlans = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const plans = await StakingPlan_1.StakingPlan.find()
            .populate('userId', 'email firstName lastName')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = await StakingPlan_1.StakingPlan.countDocuments();
        res.json({
            plans,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching staking plans', error });
    }
};
exports.getAllStakingPlans = getAllStakingPlans;
// MLM Management
const getMLMStats = async (req, res) => {
    try {
        const topReferrers = await User_1.User.aggregate([
            { $match: { referredBy: { $exists: true, $ne: null } } },
            { $group: { _id: '$referredBy', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { _id: 1, count: 1, email: '$user.email', firstName: '$user.firstName', lastName: '$user.lastName' } }
        ]);
        const totalNetworkSize = await User_1.User.countDocuments({ referredBy: { $exists: true, $ne: null } });
        res.json({
            topReferrers,
            totalNetworkSize,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching MLM stats', error });
    }
};
exports.getMLMStats = getMLMStats;
// Create a new Jackpot round
const createJackpotRound = async (req, res) => {
    try {
        const { round, poolAmount } = req.body;
        // Check if there is already an open jackpot round
        const existingOpen = await Jackpot_1.Jackpot.findOne({ status: 'open' });
        if (existingOpen) {
            res.status(400).json({ message: 'There is already an open jackpot round active' });
            return;
        }
        const nextRound = round || ((await Jackpot_1.Jackpot.findOne().sort({ round: -1 }))?.round || 0) + 1;
        const jackpot = await Jackpot_1.Jackpot.create({
            round: nextRound,
            poolAmount: poolAmount || 0,
            status: 'open',
            participants: []
        });
        // Log admin action
        await AdminLog_1.AdminLog.create({
            adminId: req.user.id,
            action: 'create_jackpot',
            details: `Created jackpot round ${nextRound} with initial pool ${poolAmount || 0}`,
            ipAddress: req.ip
        });
        res.status(201).json({ message: 'Jackpot round created successfully', jackpot });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating jackpot round', error });
    }
};
exports.createJackpotRound = createJackpotRound;
// Create or update Salary config for a user
const saveSalaryConfig = async (req, res) => {
    try {
        const { userId, email, monthlyAmount, currency, status } = req.body;
        let targetUser = null;
        if (userId) {
            targetUser = await User_1.User.findById(userId);
        }
        else if (email) {
            targetUser = await User_1.User.findOne({ email });
        }
        if (!targetUser) {
            res.status(404).json({ message: 'User not found. Check ID/email.' });
            return;
        }
        // Check if salary record already exists
        let salary = await Salary_1.Salary.findOne({ userId: targetUser._id });
        if (salary) {
            salary.monthlyAmount = monthlyAmount;
            salary.currency = currency || 'USDT';
            salary.status = status || 'active';
            await salary.save();
        }
        else {
            salary = await Salary_1.Salary.create({
                userId: targetUser._id,
                monthlyAmount,
                currency: currency || 'USDT',
                status: status || 'active'
            });
        }
        // Log admin action
        await AdminLog_1.AdminLog.create({
            adminId: req.user.id,
            action: 'configure_salary',
            targetUserId: targetUser._id,
            details: `Configured monthly salary to ${monthlyAmount} ${currency || 'USDT'} (${status || 'active'})`,
            ipAddress: req.ip
        });
        res.status(200).json({ message: 'Salary configuration saved successfully', salary });
    }
    catch (error) {
        res.status(500).json({ message: 'Error saving salary configuration', error });
    }
};
exports.saveSalaryConfig = saveSalaryConfig;
