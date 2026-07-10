import { Server, Socket } from "socket.io";

export function setupSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join-room", (roomId: string) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on("leave-room", (roomId: string) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    socket.on("chat:message", (data: { roomId: string; message: string; user: { id: string; name: string } }) => {
      io.to(data.roomId).emit("chat:message", {
        user: data.user,
        message: data.message,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("file:uploaded", (data: { roomId: string; file: any }) => {
      io.to(data.roomId).emit("file:uploaded", data.file);
    });

    socket.on("file:deleted", (data: { roomId: string; fileId: string }) => {
      io.to(data.roomId).emit("file:deleted", data.fileId);
    });

    socket.on("room:activity", (data: { roomId: string; activity: any }) => {
      io.to(data.roomId).emit("room:activity", data.activity);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}
