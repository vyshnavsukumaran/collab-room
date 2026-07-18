"use client";

import { Suspense, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, LogOut, GitBranch, Link2, Link2Off, Check } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { GitHubStatus } from "@/lib/types";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

function SettingsContent() {
  const { user, logout } = useAuth();
  const searchParams = useSearchParams();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [github, setGitHub] = useState<GitHubStatus | null>(null);
  const [loadingGitHub, setLoadingGitHub] = useState(true);

  useEffect(() => {
    const githubParam = searchParams.get("github");
    const username = searchParams.get("username");
    if (githubParam === "success") {
      toast.success(`Connected to GitHub as ${username}`);
    } else if (githubParam === "error") {
      toast.error("Failed to connect GitHub");
    }
  }, [searchParams]);

  useEffect(() => {
    api.get<GitHubStatus>("/github/status")
      .then(setGitHub)
      .catch(() => {})
      .finally(() => setLoadingGitHub(false));
  }, []);

  const handleGitHubConnect = async () => {
    try {
      const data = await api.get<{ url: string }>("/github/oauth/authorize");
      window.location.href = data.url;
    } catch {
      toast.error("Failed to initiate GitHub connection");
    }
  };

  const handleGitHubDisconnect = async () => {
    try {
      await api.delete("/github/disconnect");
      setGitHub({ connected: false, username: null, avatarUrl: null });
      toast.success("GitHub account disconnected");
    } catch {
      toast.error("Failed to disconnect GitHub");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/home" />}>
                <ArrowLeft className="size-5" />
              </Button>
              <h1 className="font-semibold">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="size-16">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {user?.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">Change Avatar</Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GitHub Integration</CardTitle>
            <CardDescription>Connect your GitHub account to enable repo browsing and code editing in rooms</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingGitHub ? (
              <div className="h-10 bg-muted rounded animate-pulse" />
            ) : github?.connected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    {github.avatarUrl && <AvatarImage src={github.avatarUrl} />}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <GitBranch className="size-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{github.username}</span>
                      <Check className="size-4 text-green-500" />
                    </div>
                    <p className="text-xs text-muted-foreground">Connected to GitHub</p>
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={handleGitHubDisconnect}>
                  <Link2Off className="size-4 mr-1" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                    <GitBranch className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Not connected</p>
                    <p className="text-xs text-muted-foreground">Connect to browse and edit repos</p>
                  </div>
                </div>
                <Button size="sm" onClick={handleGitHubConnect}>
                  <Link2 className="size-4 mr-1" />
                  Connect GitHub
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Password</label>
              <Input type="password" placeholder="Enter current password" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input type="password" placeholder="Enter new password" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input type="password" placeholder="Confirm new password" />
            </div>
            <Button>Update Password</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {["Email Notifications", "Push Notifications", "Activity Updates", "Mentions"].map(
              (item) => (
                <div key={item} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={logout}
            >
              <LogOut className="size-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
