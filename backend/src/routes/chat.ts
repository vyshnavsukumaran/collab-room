import { Router, Response } from "express";
import { prisma } from "../index";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/:roomId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const room = await prisma.room.findUnique({ where: { roomId: req.params.roomId as string } });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: req.userId! } },
    });
    if (!member || member.status !== "approved") {
      return res.status(403).json({ error: "Not a member of this room" });
    }

    const messages = await prisma.message.findMany({
      where: { roomId: room.id },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    res.json(messages);
  } catch (error) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/:roomId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const room = await prisma.room.findUnique({ where: { roomId: req.params.roomId as string } });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: req.userId! } },
    });
    if (!member || member.status !== "approved") {
      return res.status(403).json({ error: "Not a member of this room" });
    }

    const msg = await prisma.message.create({
      data: {
        roomId: room.id,
        senderId: req.userId!,
        message: message.slice(0, 5000),
      },
      include: { sender: { select: { id: true, name: true } } },
    });

    res.status(201).json(msg);
  } catch (error) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
