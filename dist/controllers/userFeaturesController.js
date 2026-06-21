"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveAnnouncements = exports.getTicketDetails = exports.replyTicket = exports.createTicket = exports.getMyTickets = exports.getMySalaryInfo = exports.participateJackpot = exports.getActiveJackpot = void 0;
const Jackpot_1 = require("../models/Jackpot");
const Salary_1 = require("../models/Salary");
const SupportTicket_1 = require("../models/SupportTicket");
const Announcement_1 = require("../models/Announcement");
const Wallet_1 = require("../models/Wallet");
const Transaction_1 = require("../models/Transaction");
const mongoose_1 = __importDefault(require("mongoose"));
// ==========================
// JACKPOT SYSTEM
// ==========================
const getActiveJackpot = async (req, res) => {
    try {
        const activeJackpot = await Jackpot_1.Jackpot.findOne({ status: 'open' }).sort({ round: -1 });
        const pastJackpots = await Jackpot_1.Jackpot.find({ status: 'drawn' })
            .populate('winnerId', 'firstName lastName')
            .sort({ drawnAt: -1 })
            .limit(10);
        res.json({
            active: activeJackpot,
            history: pastJackpots,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch jackpots' });
    }
};
exports.getActiveJackpot = getActiveJackpot;
const participateJackpot = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const userId = req.user?.id;
        if (!userId)
            throw new Error('Unauthenticated');
        const activeJackpot = await Jackpot_1.Jackpot.findOne({ status: 'open' }).session(session);
        if (!activeJackpot) {
            res.status(400).json({ error: 'No active jackpot available' });
            await session.abortTransaction();
            return;
        }
        if (activeJackpot.participants.includes(new mongoose_1.default.Types.ObjectId(userId))) {
            res.status(400).json({ error: 'You are already participating in this round' });
            await session.abortTransaction();
            return;
        }
        // Example logic: Cost is 10 USDT from Main Wallet to enter
        const ENTRY_FEE = 10;
        const wallet = await Wallet_1.Wallet.findOne({ userId, currency: 'USDT' }).session(session);
        if (!wallet || Number(wallet.mainBalance.toString()) < ENTRY_FEE) {
            res.status(400).json({ error: `Insufficient USDT balance. ${ENTRY_FEE} USDT required.` });
            await session.abortTransaction();
            return;
        }
        const currentBal = Number(wallet.mainBalance.toString());
        wallet.mainBalance = mongoose_1.default.Types.Decimal128.fromString((currentBal - ENTRY_FEE).toString());
        await wallet.save({ session });
        // Add to pool
        const currentPool = Number(activeJackpot.poolAmount.toString());
        activeJackpot.poolAmount = mongoose_1.default.Types.Decimal128.fromString((currentPool + ENTRY_FEE).toString());
        activeJackpot.participants.push(new mongoose_1.default.Types.ObjectId(userId));
        await activeJackpot.save({ session });
        await Transaction_1.Transaction.create([{
                userId,
                walletId: wallet._id,
                type: 'withdrawal',
                currency: 'USDT',
                amount: mongoose_1.default.Types.Decimal128.fromString(ENTRY_FEE.toString()),
                fee: mongoose_1.default.Types.Decimal128.fromString('0'),
                status: 'completed',
                metadata: { description: `GMC Jackpot Round ${activeJackpot.round} Entry Fee` }
            }], { session });
        await session.commitTransaction();
        res.json({ message: 'Successfully joined the jackpot!', jackpot: activeJackpot });
    }
    catch (error) {
        await session.abortTransaction();
        res.status(500).json({ error: 'Failed to participate' });
    }
    finally {
        session.endSession();
    }
};
exports.participateJackpot = participateJackpot;
// ==========================
// SALARY SYSTEM
// ==========================
const getMySalaryInfo = async (req, res) => {
    try {
        const userId = req.user?.id;
        const salary = await Salary_1.Salary.findOne({ userId, status: 'active' });
        const salaryHistory = await Transaction_1.Transaction.find({
            userId,
            type: 'earnings',
            'metadata.source': 'salary'
        }).sort({ createdAt: -1 });
        res.json({
            salary,
            history: salaryHistory,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch salary info' });
    }
};
exports.getMySalaryInfo = getMySalaryInfo;
// ==========================
// SUPPORT SYSTEM
// ==========================
const getMyTickets = async (req, res) => {
    try {
        const userId = req.user?.id;
        const tickets = await SupportTicket_1.SupportTicket.find({ userId }).sort({ updatedAt: -1 });
        res.json(tickets);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
};
exports.getMyTickets = getMyTickets;
const createTicket = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { subject, message } = req.body;
        const ticket = await SupportTicket_1.SupportTicket.create({
            userId,
            subject,
            status: 'open',
            replies: [{ sender: 'user', message }]
        });
        res.status(201).json(ticket);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create ticket' });
    }
};
exports.createTicket = createTicket;
const replyTicket = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { message } = req.body;
        const ticket = await SupportTicket_1.SupportTicket.findOne({ _id: id, userId });
        if (!ticket) {
            res.status(404).json({ error: 'Ticket not found' });
            return;
        }
        ticket.replies.push({ sender: 'user', message, createdAt: new Date() });
        ticket.status = 'open'; // Reopen if closed
        await ticket.save();
        res.json(ticket);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reply to ticket' });
    }
};
exports.replyTicket = replyTicket;
const getTicketDetails = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const ticket = await SupportTicket_1.SupportTicket.findOne({ _id: id, userId });
        if (!ticket) {
            res.status(404).json({ error: 'Ticket not found' });
            return;
        }
        res.json(ticket);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
};
exports.getTicketDetails = getTicketDetails;
// ==========================
// ANNOUNCEMENTS
// ==========================
const getActiveAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement_1.Announcement.find({ status: 'published' }).sort({ createdAt: -1 });
        res.json(announcements);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
};
exports.getActiveAnnouncements = getActiveAnnouncements;
