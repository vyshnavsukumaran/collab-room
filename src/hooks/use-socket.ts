"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:4000";

export function useSocket(roomId: string | null, onMessage?: (data: { user: { id: string; name: string }; message: string; timestamp: string }) => void) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const sendMessage = useCallback((data: { roomId: string; message: string; user: { id: string; name: string } }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("chat:message", data);
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", roomId);
    });

    socket.on("chat:message", (data) => {
      onMessageRef.current?.(data);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    return () => {
      socket.emit("leave-room", roomId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  return { sendMessage };
}
