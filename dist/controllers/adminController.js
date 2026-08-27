"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = exports.getReports = exports.unblockUser = exports.blockUser = exports.getAllUsers = exports.getDashboard = void 0;
const User_1 = require("../models/User");
const db_1 = require("../config/db");
const SystemLog_1 = require("../models/SystemLog");
const getDashboard = async (_req, res) => {
    try {
        const usersCount = await (0, db_1.query)(`SELECT COUNT(*) FROM users`);
        const foodsCount = await (0, db_1.query)(`SELECT COUNT(*) FROM foods`);
        const requestsCount = await (0, db_1.query)(`SELECT COUNT(*) FROM requests`);
        const donationsCount = await (0, db_1.query)(`SELECT COUNT(*) FROM donations`);
        const monthlyStats = await (0, db_1.query)(`
      SELECT TO_CHAR(created_at, 'Mon YYYY') as month, COUNT(*) as count
      FROM foods
      GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) DESC
      LIMIT 6
    `);
        res.status(200).json({
            success: true,
            dashboard: {
                totalUsers: parseInt(usersCount.rows[0].count, 10),
                totalFoods: parseInt(foodsCount.rows[0].count, 10),
                totalRequests: parseInt(requestsCount.rows[0].count, 10),
                totalDonations: parseInt(donationsCount.rows[0].count, 10),
                monthlyStats: monthlyStats.rows
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error loading admin dashboard data' });
    }
};
exports.getDashboard = getDashboard;
const getAllUsers = async (req, res) => {
    try {
        const role = req.query.role;
        const users = await User_1.UserModel.getAll(role);
        res.status(200).json({ success: true, count: users.length, users });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving users' });
    }
};
exports.getAllUsers = getAllUsers;
const blockUser = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const updated = await User_1.UserModel.update(id, { is_active: false });
        await SystemLog_1.SystemLogModel.create({
            user_id: req.user.id,
            action: 'USER_BLOCKED',
            details: { target_user_id: id }
        });
        res.status(200).json({ success: true, message: 'User deactivated/blocked', user: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error blocking user' });
    }
};
exports.blockUser = blockUser;
const unblockUser = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const updated = await User_1.UserModel.update(id, { is_active: true });
        await SystemLog_1.SystemLogModel.create({
            user_id: req.user.id,
            action: 'USER_UNBLOCKED',
            details: { target_user_id: id }
        });
        res.status(200).json({ success: true, message: 'User activated/unblocked', user: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error unblocking user' });
    }
};
exports.unblockUser = unblockUser;
const getReports = async (_req, res) => {
    try {
        const logs = await SystemLog_1.SystemLogModel.findAll(50);
        res.status(200).json({ success: true, logs });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving reports' });
    }
};
exports.getReports = getReports;
const getStats = async (_req, res) => {
    try {
        const foodStatusBreakdown = await (0, db_1.query)(`SELECT status, COUNT(*) FROM foods GROUP BY status`);
        const requestStatusBreakdown = await (0, db_1.query)(`SELECT status, COUNT(*) FROM requests GROUP BY status`);
        res.status(200).json({
            success: true,
            stats: {
                foodStatus: foodStatusBreakdown.rows,
                requestStatus: requestStatusBreakdown.rows
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error loading system stats' });
    }
};
exports.getStats = getStats;
