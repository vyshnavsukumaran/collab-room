"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Send, Paperclip, Smile, FileCode, FileText,
  ChevronRight, Folder, GitBranch, Link2,
  Save, GitCommitHorizontal, RefreshCw, AlertCircle,
  ExternalLink, X, Check,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "sonner";
import type { Room, RoomMember, Message, GitHubContent, GitHubFile, GitHubRepo, GitHubStatus, Notification } from "@/lib/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["js", "jsx", "ts", "tsx", "py", "java", "go", "rs", "dart", "c", "cpp", "h"].includes(ext || ""))
    return <FileCode className="size-5 text-primary" />;
  if (["json", "yaml", "yml", "xml", "toml"].includes(ext || ""))
    return <FileCode className="size-5 text-amber-500" />;
  if (["md", "txt", "log"].includes(ext || ""))
    return <FileText className="size-5 text-sky-500" />;
  return <FileCode className="size-5 text-muted-foreground" />;
}

function getMonacoLanguage(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", java: "java", go: "go", rs: "rust", dart: "dart",
    c: "c", cpp: "cpp", h: "c", cs: "csharp",
    html: "html", css: "css", scss: "scss", less: "less",
    json: "json", xml: "xml", yaml: "yaml", yml: "yaml",
    md: "markdown", sql: "sql", sh: "shell", bash: "shell",
    swift: "swift", kt: "kotlin", rb: "ruby", php: "php",
  };
  return langMap[ext || ""] || "plaintext";
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function RoomPage() {
  const params = useParams();
  const { user } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const roomId = params.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // GitHub state
  const [gitHubConnected, setGitHubConnected] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [repoContents, setRepoContents] = useState<GitHubContent[]>([]);
  const [currentDirPath, setCurrentDirPath] = useState("");
  const [dirStack, setDirStack] = useState<string[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);

  // Editor state
  const [selectedFile, setSelectedFile] = useState<GitHubFile | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorLoading, setEditorLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [conflictError, setConflictError] = useState("");

  const isRepoConnected = !!(room?.githubOwner && room?.githubRepo);

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
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<Room>(`/rooms/${roomId}`),
      api.get<Message[]>(`/chat/${roomId}`),
      api.get<Notification[]>(`/notifications`),
    ])
      .then(([roomData, messagesData, notifsData]) => {
        if (cancelled) return;
        setRoom(roomData);
        setMembers(roomData.members || []);
        setMessages(messagesData);
        setNotifications(notifsData.filter((n) => n.roomId === roomData.id));
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load room data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load repos when entering Files tab if repo is connected
  useEffect(() => {
    if (!isRepoConnected || !room) return;
    let cancelled = false;
    api.get<GitHubStatus>("/github/status").then((s) => {
      if (cancelled) return;
      setGitHubConnected(s.connected);
      if (s.connected && room.githubOwner && room.githubRepo) {
        setSelectedRepo({
          id: 0,
          name: room.githubRepo,
          fullName: `${room.githubOwner}/${room.githubRepo}`,
          description: null,
          private: false,
          htmlUrl: `https://github.com/${room.githubOwner}/${room.githubRepo}`,
          defaultBranch: room.githubBranch || "main",
          owner: room.githubOwner,
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [room?.githubOwner, room?.githubRepo, isRepoConnected]);

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

  // GitHub functions
  const handleConnectRepo = async (repo: GitHubRepo) => {
    try {
      await api.patch(`/rooms/${roomId}`, {
        githubOwner: repo.owner,
        githubRepo: repo.name,
        githubBranch: repo.defaultBranch,
      });
      setSelectedRepo(repo);
      setRoom((prev) => prev ? {
        ...prev,
        githubOwner: repo.owner,
        githubRepo: repo.name,
        githubBranch: repo.defaultBranch,
      } : prev);
      toast.success(`Connected to ${repo.fullName}`);
      await loadRepoContents(repo.owner, repo.name, "");
    } catch {
      toast.error("Failed to connect repo");
    }
  };

  const handleDisconnectRepo = async () => {
    try {
      await api.patch(`/rooms/${roomId}`, {
        githubOwner: null,
        githubRepo: null,
        githubBranch: null,
      });
      setSelectedRepo(null);
      setRepoContents([]);
      setCurrentDirPath("");
      setDirStack([]);
      setSelectedFile(null);
      setRoom((prev) => prev ? {
        ...prev,
        githubOwner: null,
        githubRepo: null,
        githubBranch: null,
      } : prev);
      toast.success("Repo disconnected");
    } catch {
      toast.error("Failed to disconnect repo");
    }
  };

  const loadRepoContents = async (owner: string, repo: string, path: string) => {
    setLoadingContents(true);
    try {
      const contents = await api.get<GitHubContent[]>(
        `/github/repos/${owner}/${repo}/contents?path=${encodeURIComponent(path)}`
      );
      setRepoContents(contents);
    } catch {
      toast.error("Failed to load repo contents");
    } finally {
      setLoadingContents(false);
    }
  };

  const enterDir = (dirName: string) => {
    if (!selectedRepo) return;
    const newPath = currentDirPath ? `${currentDirPath}/${dirName}` : dirName;
    setDirStack((prev) => [...prev, currentDirPath]);
    setCurrentDirPath(newPath);
    setSelectedFile(null);
    loadRepoContents(selectedRepo.owner, selectedRepo.name, newPath);
  };

  const goBackDir = () => {
    if (!selectedRepo || dirStack.length === 0) return;
    const prevPath = dirStack[dirStack.length - 1];
    setDirStack((prev) => prev.slice(0, -1));
    setCurrentDirPath(prevPath);
    setSelectedFile(null);
    loadRepoContents(selectedRepo.owner, selectedRepo.name, prevPath);
  };

  const openFile = async (filePath: string) => {
    if (!selectedRepo) return;
    setEditorLoading(true);
    setSelectedFile(null);
    setConflictError("");
    try {
      const file = await api.get<GitHubFile>(
        `/github/repos/${selectedRepo.owner}/${selectedRepo.name}/file?path=${encodeURIComponent(filePath)}`
      );
      setSelectedFile(file);
      setEditorContent(file.content);
    } catch {
      toast.error("Failed to load file");
    } finally {
      setEditorLoading(false);
    }
  };

  const closeEditor = () => {
    setSelectedFile(null);
    setEditorContent("");
    setShowCommitDialog(false);
    setConflictError("");
  };

  const handleSave = async () => {
    if (!selectedFile || !commitMessage.trim() || !selectedRepo) return;
    setCommitting(true);
    setConflictError("");
    try {
      const result = await api.put<{ success: boolean; commitSha: string; file: string }>(
        `/github/repos/${selectedRepo.owner}/${selectedRepo.name}/contents`,
        {
          path: selectedFile.path,
          message: commitMessage.trim(),
          content: editorContent,
          sha: selectedFile.sha,
        }
      );
      toast.success("Changes committed!");
      setShowCommitDialog(false);
      setCommitMessage("");
      // Refetch the file to get new sha
      const refreshed = await api.get<GitHubFile>(
        `/github/repos/${selectedRepo.owner}/${selectedRepo.name}/file?path=${encodeURIComponent(selectedFile.path)}`
      );
      setSelectedFile(refreshed);
      setEditorContent(refreshed.content);
      // Refresh notifications
      const notifs = await api.get<Notification[]>(`/notifications`);
      setNotifications(notifs.filter((n) => n.roomId === room?.id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Commit failed";
      if (msg.includes("409") || msg.includes("modified") || msg.includes("reload")) {
        setConflictError(msg);
        // Refetch latest
        try {
          const refreshed = await api.get<GitHubFile>(
            `/github/repos/${selectedRepo.owner}/${selectedRepo.name}/file?path=${encodeURIComponent(selectedFile.path)}`
          );
          setSelectedFile(refreshed);
          setEditorContent(refreshed.content);
        } catch {}
      } else {
        toast.error(msg);
      }
    } finally {
      setCommitting(false);
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
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="mt-0">
            {selectedFile ? (
              // Editor view
              <div className="flex flex-col h-[calc(100vh-16rem)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon-xs" onClick={closeEditor}>
                      <ArrowLeft className="size-4" />
                    </Button>
                    {getFileIcon(selectedFile.name)}
                    <span className="text-sm font-medium">{selectedFile.path}</span>
                    <Badge variant="secondary" className="text-[10px]">{getMonacoLanguage(selectedFile.name)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedFile.htmlUrl, "_blank")}
                    >
                      <ExternalLink className="size-3.5 mr-1" />
                      Open on GitHub
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowCommitDialog(true)}
                      disabled={editorContent === selectedFile.content}
                    >
                      <Save className="size-3.5 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>

                {conflictError && (
                  <div className="flex items-center gap-2 p-3 mb-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{conflictError}</span>
                    <Button variant="ghost" size="icon-xs" onClick={() => setConflictError("")} className="ml-auto">
                      <X className="size-3" />
                    </Button>
                  </div>
                )}

                <div className="flex-1 border rounded-lg overflow-hidden">
                  {editorLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  ) : (
                    <MonacoEditor
                      height="100%"
                      language={getMonacoLanguage(selectedFile.name)}
                      theme="vs-dark"
                      value={editorContent}
                      onChange={(val) => setEditorContent(val || "")}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: "on",
                      }}
                    />
                  )}
                </div>

                {showCommitDialog && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="Describe your changes..."
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSave();
                            }
                          }}
                          className="w-full"
                        />
                      </div>
                      <Button
                        onClick={handleSave}
                        disabled={!commitMessage.trim() || committing}
                      >
                        {committing ? (
                          <>
                            <div className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-1" />
                            Committing...
                          </>
                        ) : (
                          <>
                            <GitCommitHorizontal className="size-4 mr-1" />
                            Commit
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // File browser / repo selection view
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    {isRepoConnected ? (
                      <div className="flex items-center gap-2">
                        <GitBranch className="size-5" />
                        {room.githubOwner}/{room.githubRepo}
                      </div>
                    ) : (
                      "Files"
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    {isRepoConnected && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectedRepo && loadRepoContents(selectedRepo.owner, selectedRepo.name, currentDirPath)}
                        >
                          <RefreshCw className="size-3.5 mr-1" />
                          Refresh
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDisconnectRepo}
                            className="text-destructive"
                          >
                            Disconnect
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {isRepoConnected ? (
                  <>
                    {/* Breadcrumb navigation */}
                    <div className="flex items-center gap-1 mb-3 text-sm">
                      <button
                        onClick={() => {
                          if (!selectedRepo) return;
                          setDirStack([]);
                          setCurrentDirPath("");
                          loadRepoContents(selectedRepo.owner, selectedRepo.name, "");
                        }}
                        className="text-primary hover:underline"
                      >
                        {selectedRepo?.name || "root"}
                      </button>
                      {currentDirPath.split("/").map((part, idx, arr) => (
                        <span key={idx} className="flex items-center gap-1">
                          <ChevronRight className="size-3 text-muted-foreground" />
                          <button
                            onClick={() => {
                              if (!selectedRepo) return;
                              const target = arr.slice(0, idx + 1).join("/");
                              setDirStack((prev) => {
                                const stackIdx = prev.findIndex((p) => p === target);
                                return stackIdx >= 0 ? prev.slice(0, stackIdx) : prev;
                              });
                              setCurrentDirPath(target);
                              loadRepoContents(selectedRepo.owner, selectedRepo.name, target);
                            }}
                            className="text-primary hover:underline"
                          >
                            {part}
                          </button>
                        </span>
                      ))}
                    </div>

                    {loadingContents ? (
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="p-0">
                          {currentDirPath && (
                            <div
                              className="flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={goBackDir}
                            >
                              <Folder className="size-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">..</span>
                            </div>
                          )}
                          {repoContents
                            .sort((a, b) => {
                              if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
                              return a.name.localeCompare(b.name);
                            })
                            .map((item) => (
                              <div
                                key={item.path}
                                className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => {
                                  if (item.type === "dir") {
                                    enterDir(item.name);
                                  } else {
                                    openFile(item.path);
                                  }
                                }}
                              >
                                {item.type === "dir" ? (
                                  <Folder className="size-5 text-primary" />
                                ) : (
                                  getFileIcon(item.name)
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{item.name}</p>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {item.type === "file" ? `${(item.size / 1024).toFixed(1)} KB` : ""}
                                </span>
                              </div>
                            ))}
                          {repoContents.length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                              This directory is empty
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  // Repo selection / connect flow
                  <div className="space-y-4">
                    {repos.length === 0 && (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                          <GitBranch className="size-10 text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">No GitHub repo connected</p>
                          {canUpload && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Connect a repository to start browsing and editing code
                            </p>
                          )}
                          {canUpload && (
                            <Button
                              className="mt-4"
                              size="sm"
                              onClick={async () => {
                                setLoadingRepos(true);
                                try {
                                  const r = await api.get<GitHubRepo[]>("/github/repos");
                                  setRepos(r);
                                } catch {
                                  toast.error("Failed to load repos. Connect GitHub in Settings first.");
                                } finally {
                                  setLoadingRepos(false);
                                }
                              }}
                              disabled={loadingRepos}
                            >
                              {loadingRepos ? (
                                <>
                                  <div className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-1" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <Link2 className="size-4 mr-1" />
                                  Browse Repositories
                                </>
                              )}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {repos.length > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium">Select a repository</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRepos([])}
                          >
                            <X className="size-3.5 mr-1" />
                            Cancel
                          </Button>
                        </div>
                        <div className="grid gap-2">
                          {repos.map((repo) => (
                            <Card
                              key={repo.id}
                              className="hover:shadow-md transition-shadow cursor-pointer"
                            >
                              <CardContent
                                className="flex items-center gap-3 p-3"
                                onClick={() => handleConnectRepo(repo)}
                              >
                                <GitBranch className="size-5 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{repo.fullName}</p>
                                  {repo.description && (
                                    <p className="text-xs text-muted-foreground truncate">{repo.description}</p>
                                  )}
                                </div>
                                <Badge variant="secondary" className="text-[10px]">
                                  {repo.private ? "Private" : "Public"}
                                </Badge>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Team Members</h2>
              {isAdmin && <Button size="sm" onClick={() => toast.info("Use the room's Room ID to invite members")}>Add Member</Button>}
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
                        {member.status === "approved" ? "Active" : "Pending approval"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">{member.role}</Badge>
                    {isAdmin && member.status === "pending" && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={async () => {
                            try {
                              await api.patch(`/members/${member.id}/approve`);
                              setMembers((prev) =>
                                prev.map((m) =>
                                  m.id === member.id ? { ...m, status: "approved" } : m
                                )
                              );
                              toast.success(`${member.user.name} approved`);
                            } catch {
                              toast.error("Failed to approve member");
                            }
                          }}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            try {
                              await api.delete(`/members/${member.id}`);
                              setMembers((prev) => prev.filter((m) => m.id !== member.id));
                              toast.success(`${member.user.name} rejected`);
                            } catch {
                              toast.error("Failed to reject member");
                            }
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    )}
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
                  <Button type="button" variant="ghost" size="icon" onClick={() => toast.info("File attachment coming soon")}>
                    <Paperclip className="size-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => toast.info("Emoji picker coming soon")}>
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
                {notifications.length > 0 ? (
                  notifications.map((notif) => {
                    let metadata = null;
                    try {
                      metadata = notif.metadata ? JSON.parse(notif.metadata) : null;
                    } catch {}
                    const isExternal = metadata?.external;
                    return (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${!notif.isRead ? "bg-primary/5" : ""}`}
                      >
                        <div className={`size-8 rounded-full flex items-center justify-center mt-0.5 ${isExternal ? "bg-orange-100" : "bg-primary/10"}`}>
                          <GitBranch className={`size-4 ${isExternal ? "text-orange-600" : "text-primary"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{notif.title}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                            {isExternal && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                <ExternalLink className="size-2.5 mr-0.5" />
                                External
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
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
