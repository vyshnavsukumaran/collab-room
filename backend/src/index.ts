import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth";
import { RawBodyRequest } from "./middleware/auth";
import roomRoutes from "./routes/room";
import memberRoutes from "./routes/member";
import fileRoutes from "./routes/file";
import chatRoutes from "./routes/chat";
import notificationRoutes from "./routes/notification";
import githubRoutes from "./routes/github";
import { setupSocketHandlers } from "./services/socket";

const app = express();
const httpServer = createServer(app);
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

const corsOptions: cors.CorsOptions = {
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

const io = new Server(httpServer, {
  cors: corsOptions,
});

export const prisma = new PrismaClient();

app.use(cors(corsOptions));

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as RawBodyRequest).rawBody = buf.toString();
    },
  })
);
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/github", githubRoutes);

app.get("/api/health", async (_req, res) => {
  let db = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    db = error instanceof Error ? error.message : "unknown database error";
  }
  res.json({
    status: db === "ok" ? "ok" : "degraded",
    db,
    timestamp: new Date().toISOString(),
  });
});

setupSocketHandlers(io);

const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
  console.log(`CollabRoom backend running on port ${port}`);
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — database queries will fail");
  }
  prisma
    .$connect()
    .then(() => console.log("Database connected"))
    .catch((error) => {
      console.error("Database connection failed:", error);
    });
});
