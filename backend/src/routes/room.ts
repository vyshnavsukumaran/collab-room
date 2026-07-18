import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../index";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

function generateRoomId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const p1 = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * 36)]).join("");
  const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 36)]).join("");
  const p3 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 36)]).join("");
  return `${p1}-${p2}-${p3}`;
}

router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId: providedRoomId, name, projectType, description, maxMembers } = req.body;
    const roomId = providedRoomId || generateRoomId();

    const room = await prisma.room.create({
      data: {
        roomId,
        name,
        projectType,
        description,
        maxMembers,
        createdBy: req.userId!,
        members: {
          create: {
            userId: req.userId!,
            role: "admin",
            status: "approved",
          },
        },
      },
      include: { members: true },
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ error: "Failed to create room" });
  }
});

router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      where: {
        members: { some: { userId: req.userId! } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { files: true, messages: true } },
      },
    });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

router.get("/:roomId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const room = await prisma.room.findUnique({
      where: { roomId: req.params.roomId as string },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { files: true, messages: true } },
      },
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch room" });
  }
});

router.patch("/:roomId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { githubOwner, githubRepo, githubBranch } = req.body;
    const room = await prisma.room.findUnique({ where: { roomId: req.params.roomId as string } });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: req.userId! } },
    });
    if (!member || member.role !== "admin") {
      return res.status(403).json({ error: "Only admins can modify room settings" });
    }

    const data: any = {};
    if (githubOwner !== undefined) data.githubOwner = githubOwner;
    if (githubRepo !== undefined) data.githubRepo = githubRepo;
    if (githubBranch !== undefined) data.githubBranch = githubBranch;

    const updated = await prisma.room.update({
      where: { id: room.id },
      data,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update room" });
  }
});

router.delete("/:roomId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const room = await prisma.room.findUnique({ where: { roomId: req.params.roomId as string } });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    if (room.createdBy !== req.userId) {
      return res.status(403).json({ error: "Only the creator can delete the room" });
    }

    await prisma.room.delete({ where: { id: room.id } });
    res.json({ message: "Room deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete room" });
  }
});

export default router;
