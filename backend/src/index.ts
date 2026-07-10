import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth";
import roomRoutes from "./routes/room";
import memberRoutes from "./routes/member";
import fileRoutes from "./routes/file";
import chatRoutes from "./routes/chat";
import notificationRoutes from "./routes/notification";
import { setupSocketHandlers } from "./services/socket";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

export const prisma = new PrismaClient();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

setupSocketHandlers(io);

const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
  console.log(`CollabRoom backend running on port ${PORT}`);
});
