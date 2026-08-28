import { Request, Response } from 'express';
import { ChatMessageModel } from '../models/ChatMessage';
import { getIO } from '../services/socketService';

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const otherUserId = parseInt(req.params.userId, 10);
    const messages = await ChatMessageModel.getConversation(req.user!.id, otherUserId);
    await ChatMessageModel.markAsRead(otherUserId, req.user!.id);
    res.status(200).json({ success: true, count: messages.length, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving chat history' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { receiver_id, message } = req.body;
    const chatMsg = await ChatMessageModel.create({
      sender_id: req.user!.id,
      receiver_id: parseInt(receiver_id, 10),
      message
    });

    try {
      const io = getIO();
      io.to(`user_${receiver_id}`).emit('new_message', chatMsg);
    } catch (e) {
      // Socket optional fallback
    }

    res.status(201).json({ success: true, message: chatMsg });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error sending message' });
  }
};
