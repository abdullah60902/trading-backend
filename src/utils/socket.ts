import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let io: SocketIOServer;

// Map to store connected users: userId -> socketId
const userSockets = new Map<string, string>();

export const initSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { id: string };
      socket.data.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    userSockets.set(userId, socket.id);
    
    // Join a room specific to the user for easy direct messaging
    socket.join(userId);
    
    console.log(`User connected: ${userId} (Socket: ${socket.id})`);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      userSockets.delete(userId);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Helper function to emit to a specific user
export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(userId).emit(event, data);
  }
};

// Helper function to emit to all users (e.g., global announcements)
export const emitToAll = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
  }
};
