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

    const messages = await prisma.message.findMany({
      where: { roomId: room.id },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/:roomId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    const room = await prisma.room.findUnique({ where: { roomId: req.params.roomId as string } });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const msg = await prisma.message.create({
      data: {
        roomId: room.id,
        senderId: req.userId!,
        message,
      },
      include: { sender: { select: { id: true, name: true } } },
    });

    res.status(201).json(msg);
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
