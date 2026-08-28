"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const Notification_1 = require("../models/Notification");
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification_1.NotificationModel.findByUser(req.user.id);
        res.status(200).json({ success: true, count: notifications.length, notifications });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving notifications' });
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res) => {
    try {
        const { id } = req.body;
        await Notification_1.NotificationModel.markAsRead(parseInt(id, 10));
        res.status(200).json({ success: true, message: 'Notification marked as read' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error marking notification' });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        await Notification_1.NotificationModel.markAllAsRead(req.user.id);
        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error marking notifications' });
    }
};
exports.markAllAsRead = markAllAsRead;
