import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "../index";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface ChatMessageData {
  roomId: string;
  message: string;
  user: { id: string; name: string };
}

async function findRoomByDisplayId(roomId: string) {
  if (typeof roomId !== "string" || !roomId) return null;
  return prisma.room.findUnique({ where: { roomId } });
}

async function getMembership(roomId: string, userId?: string) {
  if (!userId) return null;
  const room = await findRoomByDisplayId(roomId);
  if (!room) return null;
  return prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId } },
  });
}

export function setupSocketHandlers(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(new Error("JWT_SECRET not configured on server"));
    }
    try {
      const decoded = jwt.verify(token, jwtSecret) as { userId: string };
      (socket as AuthenticatedSocket).userId = decoded.userId;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as AuthenticatedSocket).userId;
    console.log(`User connected: ${socket.id} (userId: ${userId})`);

    socket.on("join-room", async (roomId: string) => {
      const membership = await getMembership(roomId, userId);
      if (!membership) return;
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on("leave-room", (roomId: string) => {
      if (typeof roomId !== "string" || !roomId) return;
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    socket.on("chat:message", async (data: ChatMessageData) => {
      if (!data || typeof data !== "object" || !data.roomId) return;
      if (typeof data.message !== "string" || !data.message.trim()) return;
      const membership = await getMembership(data.roomId, userId);
      if (!membership || membership.status !== "approved") return;
      const sender = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true },
      });
      if (!sender) return;
      io.to(data.roomId).emit("chat:message", {
        user: sender,
        message: data.message.slice(0, 5000),
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("file:uploaded", async (data: { roomId: string; file: unknown }) => {
      if (!data || typeof data !== "object" || !data.roomId) return;
      const membership = await getMembership(data.roomId, userId);
      if (!membership || membership.status !== "approved") return;
      io.to(data.roomId).emit("file:uploaded", data.file);
    });

    socket.on("file:deleted", async (data: { roomId: string; fileId: string }) => {
      if (!data || typeof data !== "object" || !data.roomId) return;
      const membership = await getMembership(data.roomId, userId);
      if (!membership || membership.status !== "approved") return;
      io.to(data.roomId).emit("file:deleted", data.fileId);
    });

    socket.on("room:activity", async (data: { roomId: string; activity: unknown }) => {
      if (!data || typeof data !== "object" || !data.roomId) return;
      const membership = await getMembership(data.roomId, userId);
      if (!membership || membership.status !== "approved") return;
      io.to(data.roomId).emit("room:activity", data.activity);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}
