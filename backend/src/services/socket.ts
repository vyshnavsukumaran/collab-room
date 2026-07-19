import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

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
      (socket as any).userId = decoded.userId;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`User connected: ${socket.id} (userId: ${userId})`);

    socket.on("join-room", (roomId: string) => {
      if (typeof roomId !== "string" || !roomId) return;
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on("leave-room", (roomId: string) => {
      if (typeof roomId !== "string" || !roomId) return;
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    socket.on("chat:message", (data: { roomId: string; message: string; user: { id: string; name: string } }) => {
      if (!data || typeof data !== "object" || !data.roomId || !data.message) return;
      if (data.user?.id !== userId) return;
      io.to(data.roomId).emit("chat:message", {
        user: data.user,
        message: data.message.slice(0, 5000),
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("file:uploaded", (data: { roomId: string; file: any }) => {
      if (!data || typeof data !== "object" || !data.roomId) return;
      io.to(data.roomId).emit("file:uploaded", data.file);
    });

    socket.on("file:deleted", (data: { roomId: string; fileId: string }) => {
      if (!data || typeof data !== "object" || !data.roomId) return;
      io.to(data.roomId).emit("file:deleted", data.fileId);
    });

    socket.on("room:activity", (data: { roomId: string; activity: any }) => {
      if (!data || typeof data !== "object" || !data.roomId) return;
      io.to(data.roomId).emit("room:activity", data.activity);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}
