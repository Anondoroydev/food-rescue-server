import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { query } from '../config/db';
import { SystemLogModel } from '../models/SystemLog';

export const getDashboard = async (_req: Request, res: Response) => {
  try {
    const usersCount = await query(`SELECT COUNT(*) as count FROM users`);
    const foodsCount = await query(`SELECT COUNT(*) as count FROM foods`);
    const requestsCount = await query(`SELECT COUNT(*) as count FROM requests`);
    const donationsCount = await query(`SELECT COUNT(*) as count FROM donations`);

    const monthlyStats = await query(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM foods
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error loading admin dashboard data' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const role = req.query.role as any;
    const users = await UserModel.getAll(role);
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving users' });
  }
};

export const blockUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await UserModel.update(id, { is_active: false });
    
    await SystemLogModel.create({
      user_id: req.user!.id,
      action: 'USER_BLOCKED',
      details: { target_user_id: id }
    });

    res.status(200).json({ success: true, message: 'User deactivated/blocked', user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error blocking user' });
  }
};

export const unblockUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await UserModel.update(id, { is_active: true });

    await SystemLogModel.create({
      user_id: req.user!.id,
      action: 'USER_UNBLOCKED',
      details: { target_user_id: id }
    });

    res.status(200).json({ success: true, message: 'User activated/unblocked', user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error unblocking user' });
  }
};

export const getReports = async (_req: Request, res: Response) => {
  try {
    const logs = await SystemLogModel.findAll(50);
    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving reports' });
  }
};

export const getStats = async (_req: Request, res: Response) => {
  try {
    const foodStatusBreakdown = await query(`SELECT status, COUNT(*) as count FROM foods GROUP BY status`);
    const requestStatusBreakdown = await query(`SELECT status, COUNT(*) as count FROM requests GROUP BY status`);

    res.status(200).json({
      success: true,
      stats: {
        foodStatus: foodStatusBreakdown.rows,
        requestStatus: requestStatusBreakdown.rows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error loading system stats' });
  }
};
