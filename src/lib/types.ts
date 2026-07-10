export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Room {
  id: string;
  roomId: string;
  name: string;
  projectType: string | null;
  description: string | null;
  maxMembers: number | null;
  createdBy: string;
  createdAt: string;
  members: RoomMember[];
  _count?: { files: number; messages: number };
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: string;
  status: string;
  user: User;
}

export interface FileItem {
  id: string;
  roomId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedBy: string;
  uploader: User;
  createdAt: string;
}

export interface Sender {
  id: string;
  name: string;
  email?: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  sender: Sender;
  message: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
