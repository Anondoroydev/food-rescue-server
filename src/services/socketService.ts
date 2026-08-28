import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logInfo } from '../utils/logger';

let io: SocketIOServer | null = null;

export const initSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  io.on('connection', (socket: Socket) => {
    logInfo(`Socket client connected: ${socket.id}`);

    // Join rooms based on user role and id
    socket.on('join-room', (data: { userId: number; role: string }) => {
      if (data.userId) {
        socket.join(`user_${data.userId}`);
        logInfo(`Socket ${socket.id} joined user_${data.userId}`);

        if (data.role) {
          socket.join(`${data.role}_${data.userId}`);
          socket.join(data.role); // e.g. join 'ngo', 'restaurant', or 'admin'
        }
      }
    });

    socket.on('disconnect', () => {
      logInfo(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};
