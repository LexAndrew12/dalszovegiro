import { Server } from 'socket.io';

let io: Server | null = null;

export function initSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  });
  return io;
}

export function getSocket() {
  if (!io) {
    throw new Error('Socket.io nincs inicializálva');
  }
  return io;
}
