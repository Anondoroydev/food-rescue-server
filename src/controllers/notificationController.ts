import { Request, Response } from 'express';
import { NotificationModel } from '../models/Notification';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await NotificationModel.findByUser(req.user!.id);
    res.status(200).json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving notifications' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    await NotificationModel.markAsRead(parseInt(id, 10));
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error marking notification' });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    await NotificationModel.markAllAsRead(req.user!.id);
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error marking notifications' });
  }
};
