import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import { prisma } from "../index";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads"),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = Router();

router.post(
  "/upload",
  authenticateToken,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { roomId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const room = await prisma.room.findUnique({ where: { roomId } });
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId: room.id, userId: req.userId! } },
      });
      if (!member || member.status !== "approved") {
        return res.status(403).json({ error: "Not a member of this room" });
      }

      const ext = path.extname(file.originalname).toLowerCase();
      const fileTypeMap: Record<string, string> = {
        ".js": "code", ".jsx": "code", ".ts": "code", ".tsx": "code",
        ".html": "code", ".css": "code", ".json": "code",
        ".py": "code", ".java": "code", ".dart": "code",
        ".pdf": "doc", ".docx": "doc", ".pptx": "doc",
        ".png": "image", ".jpg": "image", ".jpeg": "image", ".svg": "image", ".gif": "image",
        ".fig": "design", ".sketch": "design",
      };

      const fileRecord = await prisma.file.create({
        data: {
          roomId: room.id,
          fileName: file.originalname,
          fileType: fileTypeMap[ext] || "other",
          fileUrl: `/uploads/${file.filename}`,
          fileSize: file.size,
          uploadedBy: req.userId!,
        },
        include: { uploader: { select: { id: true, name: true } } },
      });

      res.status(201).json(fileRecord);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

router.get("/:roomId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const room = await prisma.room.findUnique({ where: { roomId: req.params.roomId as string } });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const files = await prisma.file.findMany({
      where: { roomId: room.id },
      include: { uploader: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

router.delete("/:fileId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.fileId as string } });
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const fs = await import("fs");
    const resolvedPath = path.resolve(path.join(__dirname, "../..", file.fileUrl));
    const uploadsDir = path.resolve(path.join(__dirname, "../../uploads"));
    if (!resolvedPath.startsWith(uploadsDir)) {
      return res.status(400).json({ error: "Invalid file path" });
    }
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }

    await prisma.file.delete({ where: { id: req.params.fileId as string } });
    res.json({ message: "File deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
