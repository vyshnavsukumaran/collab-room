import { Router, Response } from "express";
import { prisma } from "../index";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/join", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.body;

    const room = await prisma.room.findUnique({ where: { roomId } });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const existing = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: req.userId! } },
    });
    if (existing) {
      return res.status(400).json({ error: "Already a member or request pending" });
    }

    const member = await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: req.userId!,
        role: "member",
        status: "pending",
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: "Failed to join room" });
  }
});

router.patch("/:memberId/approve", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const member = await prisma.roomMember.findUnique({
      where: { id: req.params.memberId as string },
      include: { room: true },
    });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const requester = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: member.roomId, userId: req.userId! } },
    });
    if (!requester || requester.role !== "admin") {
      return res.status(403).json({ error: "Only admins can approve members" });
    }

    const updated = await prisma.roomMember.update({
      where: { id: req.params.memberId as string },
      data: { status: "approved" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to approve member" });
  }
});

router.delete("/:memberId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const member = await prisma.roomMember.findUnique({
      where: { id: req.params.memberId as string },
      include: { room: true },
    });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const requester = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: member.roomId, userId: req.userId! } },
    });
    if (!requester || requester.role !== "admin") {
      return res.status(403).json({ error: "Only admins can remove members" });
    }

    await prisma.roomMember.delete({ where: { id: req.params.memberId as string } });
    res.json({ message: "Member removed" });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove member" });
  }
});

router.patch("/:memberId/role", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    const member = await prisma.roomMember.findUnique({
      where: { id: req.params.memberId as string },
      include: { room: true },
    });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const requester = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: member.roomId, userId: req.userId! } },
    });
    if (!requester || requester.role !== "admin") {
      return res.status(403).json({ error: "Only admins can change roles" });
    }

    const updated = await prisma.roomMember.update({
      where: { id: req.params.memberId as string },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to change role" });
  }
});

export default router;
