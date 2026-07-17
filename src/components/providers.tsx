"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
