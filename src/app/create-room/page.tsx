"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Check } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Room } from "@/lib/types";

function generateRoomId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const part1 = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const part3 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part1}-${part2}-${part3}`;
}

export default function CreateRoomPage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [roomId] = useState(generateRoomId);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const room = await api.post<Room>("/rooms", {
        roomId,
        name: roomName,
        description,
        projectType,
        maxMembers: maxMembers ? parseInt(maxMembers) : undefined,
      });
      toast.success("Room created successfully!");
      router.push(`/room/${room.roomId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create room";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Home
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create a New Room</CardTitle>
            <CardDescription>Set up a workspace for your project team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 rounded-lg bg-secondary/50 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Room ID</p>
                  <p className="text-lg font-mono font-bold tracking-wider">{roomId}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
              <div className="mt-2">
                <Badge variant="secondary">Invite Link: app.com/join/{roomId}</Badge>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="roomName" className="text-sm font-medium">Room Name</label>
                <Input
                  id="roomName"
                  placeholder="e.g., VendFlow Development"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">Description</label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="What is this project about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="projectType" className="text-sm font-medium">Project Type</label>
                  <select
                    id="projectType"
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    required
                  >
                    <option value="">Select type</option>
                    <option value="Web App">Web App</option>
                    <option value="Mobile App">Mobile App</option>
                    <option value="Backend">Backend</option>
                    <option value="Design">Design</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="maxMembers" className="text-sm font-medium">Max Members</label>
                  <select
                    id="maxMembers"
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="2">2 members</option>
                    <option value="3">3 members</option>
                    <option value="4">4 members</option>
                    <option value="5">5 members</option>
                    <option value="10">10 members</option>
                    <option value="20">20 members</option>
                  </select>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Room"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
