import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Team Collaboration",
    description: "Work together in real-time with your team members in dedicated project rooms.",
    icon: "👥",
  },
  {
    title: "File Sync",
    description: "Upload and sync code, designs, and documents across your team.",
    icon: "📁",
  },
  {
    title: "Real-time Chat",
    description: "Communicate instantly with built-in group messaging and file sharing.",
    icon: "💬",
  },
  {
    title: "Notifications",
    description: "Stay updated with email and in-app notifications for all activity.",
    icon: "🔔",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                CR
              </div>
              <span className="font-semibold text-lg">CollabRoom</span>
            </div>
            <nav className="hidden sm:flex items-center gap-6">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Button nativeButton={false} render={<Link href="/sign-up" />}>
                Get Started
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#4285F4] via-[#5B9CF6] to-[#7BB3F8] opacity-10"
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#4285F4]/20 via-transparent to-transparent"
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-8">
              <span className="size-2 rounded-full bg-green-500 animate-pulse" />
              Real-time collaboration platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Collaborate on Code
              <br />
              <span className="text-primary">in Real Time</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-10">
              CollabRoom brings your team together in one place — code, design, chat, and project
              management, all synchronized in real-time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 h-12" nativeButton={false} render={<Link href="/sign-up" />}>
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" nativeButton={false} render={<Link href="/sign-in" />}>
                Sign In
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Everything your team needs</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From code to chat, manage your entire project workflow in a single room.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                CR
              </div>
              <span className="font-semibold">CollabRoom</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">About</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} CollabRoom. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
