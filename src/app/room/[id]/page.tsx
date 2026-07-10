"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Send, Paperclip, Smile, FileCode, FileImage, FileText,
  Download, Trash2, Upload, Plus
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "sonner";
import type { Room, RoomMember, FileItem, Message } from "@/lib/types";

function getFileIcon(type: string) {
  switch (type) {
    case "code": return <FileCode className="size-5 text-primary" />;
    case "design": return <FileImage className="size-5 text-purple-500" />;
    case "doc": return <FileText className="size-5 text-orange-500" />;
    case "image": return <FileImage className="size-5 text-green-500" />;
    default: return <FileText className="size-5 text-muted-foreground" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function RoomPage() {
  const params = useParams();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const roomId = params.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleIncomingMessage = useCallback(
    (data: { user: { id: string; name: string }; message: string; timestamp: string }) => {
      if (data.user.id !== user?.id) {
        const msg: Message = {
          id: crypto.randomUUID(),
          roomId,
          senderId: data.user.id,
          sender: { id: data.user.id, name: data.user.name, email: "" },
          message: data.message,
          createdAt: data.timestamp,
        };
        setMessages((prev) => [...prev, msg]);
      }
    },
    [roomId, user?.id]
  );

  const { sendMessage: sendSocketMessage } = useSocket(roomId, handleIncomingMessage);

  useEffect(() => {
    Promise.all([
      api.get<Room>(`/rooms/${roomId}`),
      api.get<FileItem[]>(`/files/${roomId}`),
      api.get<Message[]>(`/chat/${roomId}`),
    ])
      .then(([roomData, filesData, messagesData]) => {
        setRoom(roomData);
        setMembers(roomData.members || []);
        setFiles(filesData);
        setMessages(messagesData);
      })
      .catch(() => toast.error("Failed to load room data"))
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomId", roomId);

    try {
      const newFile = await api.upload<FileItem>("/files/upload", formData);
      setFiles((prev) => [newFile, ...prev]);
      toast.success("File uploaded");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await api.delete(`/files/${fileId}`);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success("File deleted");
    } catch {
      toast.error("Failed to delete file");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSendingMessage(true);
    try {
      const msg = await api.post<Message>(`/chat/${roomId}`, { message });
      setMessages((prev) => [...prev, msg]);
      sendSocketMessage({
        roomId,
        message: msg.message,
        user: { id: msg.sender.id, name: msg.sender.name },
      });
      setMessage("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Room not found</p>
            <Button nativeButton={false} render={<Link href="/home" />}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentMember = members.find((m) => m.userId === user?.id);
  const isAdmin = currentMember?.role === "admin";
  const canUpload = currentMember?.status === "approved";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/home" />}>
                <ArrowLeft className="size-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-sm">{room.name}</h1>
                <p className="text-xs text-muted-foreground font-mono">{room.roomId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {members.filter((m) => m.status === "approved").slice(0, 4).map((m) => (
                  <Avatar key={m.id} className="size-7 border-2 border-background">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                      {m.user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {members.filter((m) => m.status === "approved").length > 4 && (
                  <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium border-2 border-background">
                    +{members.filter((m) => m.status === "approved").length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="files" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="designs">Designs</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Files</h2>
              {canUpload && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleUpload}
                  />
                  <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? (
                      <>
                        <div className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-1" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="size-4 mr-1" />
                        Upload File
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            {files.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Paperclip className="size-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No files yet</p>
                  {canUpload && (
                    <p className="text-xs text-muted-foreground mt-1">Upload your first file to get started</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {files.map((file) => (
                  <Card key={file.id}>
                    <CardContent className="flex items-center gap-4 p-3">
                      {getFileIcon(file.fileType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.uploader.name} • {formatFileSize(file.fileSize || 0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs">
                          <Download className="size-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteFile(file.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="designs" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Designs</h2>
              {canUpload && (
                <Button size="sm">
                  <Plus className="size-4 mr-1" />
                  Add Design
                </Button>
              )}
            </div>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileImage className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No designs yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Team Members</h2>
              {isAdmin && <Button size="sm">Add Member</Button>}
            </div>
            <Card>
              <CardContent className="p-0">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.user.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background ${
                          member.status === "approved" ? "bg-green-500" : "bg-yellow-500"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {member.status === "approved" ? "Active" : "Pending"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">{member.role}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            <Card className="flex flex-col h-[500px]">
              <CardHeader className="border-b px-4 py-3">
                <CardTitle className="text-sm font-medium">Team Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3">
                      <Avatar className="size-8 mt-0.5">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {msg.sender.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{msg.sender.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </CardContent>
              <div className="border-t p-3">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="icon">
                    <Paperclip className="size-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="icon">
                    <Smile className="size-4" />
                  </Button>
                  <Button type="submit" size="icon" disabled={!message.trim() || sendingMessage}>
                    {sendingMessage ? (
                      <div className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </Button>
                </form>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="updates" className="mt-0">
            <h2 className="text-lg font-semibold mb-4">Activity Feed</h2>
            <Card>
              <CardContent className="p-0">
                {files.slice(0, 10).map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {file.uploader.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-sm">
                      <span className="font-medium">{file.uploader.name}</span>{" "}
                      <span className="text-muted-foreground">uploaded</span>{" "}
                      <span className="font-medium">{file.fileName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {files.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No activity yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
