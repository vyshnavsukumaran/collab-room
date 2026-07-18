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
  githubOwner: string | null;
  githubRepo: string | null;
  githubBranch: string | null;
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
  type: string;
  roomId: string | null;
  metadata: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface GitHubStatus {
  connected: boolean;
  username: string | null;
  avatarUrl: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
  owner: string;
}

export interface GitHubContent {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  sha: string;
  downloadUrl: string | null;
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string;
  htmlUrl: string;
}

export interface GitHubCommitResult {
  success: boolean;
  commitSha: string;
  commitUrl: string;
  file: string;
}
