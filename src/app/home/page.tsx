"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Bell, Settings, LogOut, Search, Users, FolderOpen } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Room } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Room[]>("/rooms")
      .then(setRooms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                CR
              </div>
              <span className="font-semibold hidden sm:inline">CollabRoom</span>
            </div>

            <div className="hidden sm:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search rooms..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="size-5" />
                <span className="absolute top-1 right-1 size-2 rounded-full bg-destructive" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center justify-center rounded-md hover:bg-muted transition-colors p-1 cursor-pointer">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {user?.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm font-medium">{user?.name}</div>
                  <div className="px-2 pb-1.5 text-xs text-muted-foreground">{user?.email}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href="/settings" className="flex items-center gap-2 w-full cursor-pointer">
                      <Settings className="size-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={logout}>
                    <LogOut className="size-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your Rooms</h1>
            <p className="text-muted-foreground text-sm">Manage your project workspaces</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" nativeButton={false} render={<Link href="/join-room" />}>
              <Plus className="size-4 mr-1" />
              Join Room
            </Button>
            <Button nativeButton={false} render={<Link href="/create-room" />}>
              <Plus className="size-4 mr-1" />
              New Room
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-4 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <Card className="mb-12">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="size-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg mb-2">No rooms yet</CardTitle>
              <CardDescription className="mb-4">Create your first room to get started</CardDescription>
              <Button nativeButton={false} render={<Link href="/create-room" />}>
                Create Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {filteredRooms.map((room) => (
              <Link key={room.id} href={`/room/${room.roomId}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        {room.projectType && (
                          <Badge variant="secondary" className="mb-2">{room.projectType}</Badge>
                        )}
                        <CardTitle className="text-base">{room.name}</CardTitle>
                        <CardDescription>ID: {room.roomId}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="size-4" />
                        {room.members.filter((m) => m.status === "approved").length}
                      </span>
                      <span className="flex items-center gap-1">
                        <FolderOpen className="size-4" />
                        {room._count?.files || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Plus className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Create Room</p>
                  <p className="text-xs text-muted-foreground">Start a new workspace</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Users className="size-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Invite Members</p>
                  <p className="text-xs text-muted-foreground">Add people to your room</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FolderOpen className="size-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Browse Files</p>
                  <p className="text-xs text-muted-foreground">View shared resources</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
