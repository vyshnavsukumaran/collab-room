"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import type { Message } from "@/lib/types";

type IncomingMessage = {
  user: { id: string; name: string };
  message: string;
  timestamp: string;
};

export function useSocket(roomId: string | null, onMessage?: (data: IncomingMessage) => void) {
  const seenMessageIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!roomId) return;

    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function pollMessages() {
      try {
        const messages = await api.get<Message[]>(`/chat/${roomId}`);

        if (seenMessageIds.current === null) {
          seenMessageIds.current = new Set(messages.map((message) => message.id));
        } else {
          for (const message of messages) {
            if (!seenMessageIds.current.has(message.id)) {
              seenMessageIds.current.add(message.id);
              onMessage?.({
                user: { id: message.sender.id, name: message.sender.name },
                message: message.message,
                timestamp: message.createdAt,
              });
            }
          }
        }
      } catch {
      } finally {
        if (active) timeout = setTimeout(pollMessages, 3000);
      }
    }

    pollMessages();

    return () => {
      active = false;
      seenMessageIds.current = null;
      if (timeout) clearTimeout(timeout);
    };
  }, [roomId, onMessage]);
}
