"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/stores/auth";
import {
  messagingApi,
  type MsgChannel,
  type MsgMessage,
  type MsgDM,
  type MsgAttachment,
} from "@/lib/api/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let chatSocket: Socket | null = null;

// ── Mock data (fallback when backend unavailable) ─────────────────
const MOCK_CHANNELS: MsgChannel[] = [
  {
    id: "1",
    name: "general",
    isPrivate: false,
    unreadCount: 3,
    lastMessage: "Ready for the sprint review?",
  },
  {
    id: "2",
    name: "alerts",
    isPrivate: false,
    unreadCount: 1,
    lastMessage: "api-service deployment failed",
  },
  {
    id: "3",
    name: "deployments",
    isPrivate: false,
    lastMessage: "auth-service v1.8.2 deployed ✅",
  },
  {
    id: "4",
    name: "eng-team",
    isPrivate: false,
    unreadCount: 5,
    lastMessage: "Standup at 10am",
  },
  {
    id: "5",
    name: "inventory",
    isPrivate: false,
    lastMessage: "PWR-003 stock critical",
  },
  {
    id: "6",
    name: "releases",
    isPrivate: true,
    lastMessage: "v2.5.0 release notes",
  },
];

const MOCK_DMS: MsgDM[] = [
  {
    id: "dm1",
    participant: { id: "u2", name: "Sarah K.", presence: "online" },
    lastMessage: "On it!",
    unreadCount: 0,
  },
  {
    id: "dm2",
    participant: { id: "u3", name: "Tony M.", presence: "online" },
    lastMessage: "Deployment done",
    unreadCount: 2,
  },
  {
    id: "dm3",
    participant: { id: "u4", name: "Alex R.", presence: "away" },
    lastMessage: "Check the logs",
    unreadCount: 0,
  },
  {
    id: "dm4",
    participant: { id: "u5", name: "Jordan B.", presence: "offline" },
    lastMessage: "See you tomorrow",
    unreadCount: 0,
  },
];

const MOCK_MESSAGES: Record<string, MsgMessage[]> = {
  "1": [
    {
      id: "m1",
      author: { id: "u2", name: "Sarah K." },
      content: "Hey team! Ready for the sprint review? We hit 27/35 points 🎉",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      reactions: [
        { emoji: "🎉", count: 4, userReacted: false },
        { emoji: "👍", count: 2, userReacted: true },
      ],
      replyCount: 3,
    },
    {
      id: "m2",
      author: { id: "u3", name: "Tony M." },
      content: "auth-service v1.8.2 is deployed and stable ✅",
      createdAt: new Date(Date.now() - 2400000).toISOString(),
      reactions: [{ emoji: "🚀", count: 3, userReacted: false }],
    },
    {
      id: "m3",
      author: { id: "u3", name: "Tony M." },
      content: "All health checks passing. No incidents in the last 6 hours.",
      createdAt: new Date(Date.now() - 2390000).toISOString(),
    },
    {
      id: "m4",
      author: { id: "u4", name: "Alex R." },
      content:
        "Nice work Tony! Can we do a quick post-mortem on yesterday's IAM issue?",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      replyCount: 1,
    },
    {
      id: "m5",
      author: { id: "me", name: "Preet Raval" },
      content:
        "Yes, let's schedule it for 2pm. I'll create an issue in the backlog.",
      createdAt: new Date(Date.now() - 900000).toISOString(),
      reactions: [{ emoji: "👍", count: 3, userReacted: false }],
    },
  ],
  "2": [
    {
      id: "a1",
      author: { id: "bot", name: "Vyne AI" },
      content:
        "🚨 **Incident Alert**: `api-service v2.4.1` deployment failed. Missing IAM permission `secretsmanager:GetSecretValue`. 47 orders affected.",
      createdAt: new Date(Date.now() - 420000).toISOString(),
      reactions: [{ emoji: "👀", count: 5, userReacted: true }],
    },
    {
      id: "a2",
      author: { id: "bot", name: "Vyne AI" },
      content:
        "Root cause identified: The new task role `ecs-api-service-prod` is missing the Secrets Manager policy. Rollback to v2.4.0 is available.",
      createdAt: new Date(Date.now() - 410000).toISOString(),
    },
    {
      id: "a3",
      author: { id: "me", name: "Preet Raval" },
      content: "Initiating rollback now. ETA 3 minutes.",
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
  ],
  "3": [
    {
      id: "d1",
      author: { id: "u3", name: "Tony M." },
      content: "✅ `auth-service v1.8.2` deployed to production",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "d2",
      author: { id: "u3", name: "Tony M." },
      content: "✅ `notification-service v1.2.0` deployed to staging",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
  "4": [
    {
      id: "e1",
      author: { id: "u2", name: "Sarah K." },
      content: "Standup at 10am everyone 🕙",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "e2",
      author: { id: "u4", name: "Alex R." },
      content: "ENG-43 is in review. Should be merged by EOD.",
      createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: "e3",
      author: { id: "me", name: "Preet Raval" },
      content:
        "LangGraph agent integration is looking solid. Will demo Friday.",
      createdAt: new Date(Date.now() - 21600000).toISOString(),
    },
  ],
  dm1: [
    {
      id: "dm1m1",
      author: { id: "me", name: "Preet Raval" },
      content: "Hey Sarah, can you review ENG-43 when you get a chance?",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: "dm1m2",
      author: { id: "u2", name: "Sarah K." },
      content: "On it! Should have feedback in an hour.",
      createdAt: new Date(Date.now() - 1700000).toISOString(),
      reactions: [{ emoji: "👍", count: 1, userReacted: false }],
    },
  ],
  dm2: [
    {
      id: "dm2m1",
      author: { id: "u3", name: "Tony M." },
      content: "Hey, the deployment is done. All green 🟢",
      createdAt: new Date(Date.now() - 600000).toISOString(),
    },
    {
      id: "dm2m2",
      author: { id: "me", name: "Preet Raval" },
      content: "Thanks Tony! Great work.",
      createdAt: new Date(Date.now() - 500000).toISOString(),
    },
    {
      id: "dm2m3",
      author: { id: "u3", name: "Tony M." },
      content: "Anything else needed before I head out?",
      createdAt: new Date(Date.now() - 400000).toISOString(),
    },
  ],
};

// ── Socket management ─────────────────────────────────────────────
function getChatSocket(token: string): Socket {
  if (chatSocket?.connected) return chatSocket;
  chatSocket = io(API_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
  return chatSocket;
}

// ── useChannels ───────────────────────────────────────────────────
export function useChannels() {
  const [channels, setChannels] = useState<MsgChannel[]>([]);
  const [dms, setDMs] = useState<MsgDM[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      messagingApi.listChannels().catch(() => ({ data: MOCK_CHANNELS })),
      messagingApi.listDMs().catch(() => ({ data: MOCK_DMS })),
    ])
      .then(([chRes, dmRes]) => {
        setChannels(chRes.data);
        setDMs(dmRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const createChannel = useCallback(
    async (name: string, description: string, isPrivate: boolean) => {
      try {
        const r = await messagingApi.createChannel({
          name,
          description,
          isPrivate,
        });
        setChannels((prev) => [...prev, r.data]);
        return r.data;
      } catch {
        const ch: MsgChannel = {
          id: `local-${Date.now()}`,
          name: name.toLowerCase().replace(/\s+/g, "-"),
          description,
          isPrivate,
        };
        setChannels((prev) => [...prev, ch]);
        return ch;
      }
    },
    [],
  );

  return { channels, dms, loading, createChannel };
}

// ── useMessages ───────────────────────────────────────────────────
interface TypingUser {
  userId: string;
  name: string;
}

export function useMessages(channelId: string | null, isDM = false) {
  const [messages, setMessages] = useState<MsgMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial messages
  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    const fetcher = isDM
      ? messagingApi.listDMMessages(channelId)
      : messagingApi.listMessages(channelId);
    const stamp = (msgs: MsgMessage[]) =>
      msgs.map((m) => ({
        ...m,
        ...(isDM
          ? { dmId: m.dmId ?? channelId }
          : { channelId: m.channelId ?? channelId }),
      }));
    fetcher
      .then((r) => setMessages(stamp(r.data.messages ?? [])))
      .catch(() => {
        setMessages(stamp(MOCK_MESSAGES[channelId] ?? []));
      })
      .finally(() => setLoading(false));
  }, [channelId, isDM]);

  // Socket.io real-time
  useEffect(() => {
    if (!token || !channelId) return;
    const socket = getChatSocket(token);
    socketRef.current = socket;

    socket.emit("join:channel", channelId);

    const onMessage = (msg: MsgMessage) => {
      if (msg.channelId === channelId || msg.dmId === channelId) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
        );
      }
    };
    const onReaction = (data: {
      messageId: string;
      reactions: MsgMessage["reactions"];
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, reactions: data.reactions } : m,
        ),
      );
    };
    const onTyping = (data: TypingUser) => {
      setTypingUsers((prev) =>
        prev.some((u) => u.userId === data.userId) ? prev : [...prev, data],
      );
      setTimeout(
        () =>
          setTypingUsers((prev) =>
            prev.filter((u) => u.userId !== data.userId),
          ),
        3000,
      );
    };

    socket.on("message:new", onMessage);
    socket.on("message:reaction", onReaction);
    socket.on("typing:start", onTyping);

    return () => {
      socket.emit("leave:channel", channelId);
      socket.off("message:new", onMessage);
      socket.off("message:reaction", onReaction);
      socket.off("typing:start", onTyping);
    };
  }, [token, channelId]);

  const sendMessage = useCallback(
    async (
      content: string,
      parentMessageId?: string,
      attachments?: MsgAttachment[],
    ) => {
      if (
        !channelId ||
        (!content.trim() && (!attachments || attachments.length === 0))
      )
        return;
      const user = useAuthStore.getState().user;
      const optimistic: MsgMessage = {
        id: `opt-${Date.now()}`,
        author: { id: user?.id ?? "me", name: user?.name ?? "Preet Raval" },
        content,
        createdAt: new Date().toISOString(),
        parentMessageId,
        attachments,
        ...(isDM ? { dmId: channelId } : { channelId }),
      };
      setMessages((prev) => {
        const next = [...prev, optimistic];
        if (parentMessageId) {
          return next.map((m) =>
            m.id === parentMessageId
              ? { ...m, replyCount: (m.replyCount ?? 0) + 1 }
              : m,
          );
        }
        return next;
      });
      try {
        if (isDM) {
          const r = await messagingApi.sendDMMessage(channelId, content);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimistic.id
                ? { ...r.data, dmId: r.data.dmId ?? channelId }
                : m,
            ),
          );
        } else {
          const r = await messagingApi.sendMessage(channelId, {
            content,
            parentMessageId,
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimistic.id
                ? { ...r.data, channelId: r.data.channelId ?? channelId }
                : m,
            ),
          );
        }
      } catch {
        // keep optimistic in dev (no backend)
      }
    },
    [channelId, isDM],
  );

  const sendTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !channelId) return;
    socket.emit("typing:start", { channelId });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, [channelId]);

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!channelId) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions?.find((r) => r.emoji === emoji);
          if (existing) {
            const newCount = existing.userReacted
              ? existing.count - 1
              : existing.count + 1;
            const newReactions =
              newCount === 0
                ? m.reactions?.filter((r) => r.emoji !== emoji)
                : m.reactions?.map((r) =>
                    r.emoji === emoji
                      ? { ...r, count: newCount, userReacted: !r.userReacted }
                      : r,
                  );
            return { ...m, reactions: newReactions };
          }
          return {
            ...m,
            reactions: [
              ...(m.reactions ?? []),
              { emoji, count: 1, userReacted: true },
            ],
          };
        }),
      );
      try {
        await messagingApi.addReaction(channelId, messageId, emoji);
      } catch {
        /* dev */
      }
    },
    [channelId],
  );

  return {
    messages,
    loading,
    typingUsers,
    sendMessage,
    sendTyping,
    addReaction,
  };
}
