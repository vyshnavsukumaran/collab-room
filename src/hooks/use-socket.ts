"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:4000";

export function useSocket(roomId: string | null, onMessage?: (data: { user: { id: string; name: string }; message: string; timestamp: string }) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.emit("join-room", roomId);

    if (onMessage) {
      socket.on("chat:message", onMessage);
    }

    return () => {
      socket.emit("leave-room", roomId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, onMessage]);

  const sendMessage = (data: { roomId: string; message: string; user: { id: string; name: string } }) => {
    socketRef.current?.emit("chat:message", data);
  };

  return { sendMessage };
}
