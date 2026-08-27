import { query } from '../config/db';
import { ChatMessage } from '../types';

export class ChatMessageModel {
  static async create(messageData: Partial<ChatMessage>): Promise<ChatMessage> {
    const { sender_id, receiver_id, message } = messageData;
    const res = await query(
      `INSERT INTO chat_messages (sender_id, receiver_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [sender_id, receiver_id, message]
    );
    return res.rows[0];
  }

  static async getConversation(user1Id: number, user2Id: number): Promise<ChatMessage[]> {
    const res = await query(
      `SELECT cm.*, u1.name as sender_name, u2.name as receiver_name
       FROM chat_messages cm
       JOIN users u1 ON cm.sender_id = u1.id
       JOIN users u2 ON cm.receiver_id = u2.id
       WHERE (cm.sender_id = $1 AND cm.receiver_id = $2)
          OR (cm.sender_id = $2 AND cm.receiver_id = $1)
       ORDER BY cm.created_at ASC`,
      [user1Id, user2Id]
    );
    return res.rows;
  }

  static async markAsRead(senderId: number, receiverId: number): Promise<boolean> {
    const res = await query(
      `UPDATE chat_messages SET is_read = true, read_at = NOW()
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
      [senderId, receiverId]
    );
    return (res.rowCount || 0) > 0;
  }

  static async getUnreadCount(userId: number): Promise<number> {
    const res = await query(
      `SELECT COUNT(*) FROM chat_messages WHERE receiver_id = $1 AND is_read = false`,
      [userId]
    );
    return parseInt(res.rows[0].count, 10);
  }
}
