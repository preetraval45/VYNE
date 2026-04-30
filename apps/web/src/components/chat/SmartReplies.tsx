"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { MsgMessage } from "@/lib/api/client";

interface SmartRepliesProps {
  readonly messages: MsgMessage[];
  readonly onPick: (text: string) => void;
  readonly currentUserNames?: string[];
  readonly channelName?: string;
}

interface ReplySet {
  emoji?: string;
  text: string;
}

/**
 * Picks 3 contextual quick replies based on the last incoming message.
 * Heuristic only — wire to ai-service later for personalized suggestions.
 * Hidden when the most recent message is from the current user.
 */
export function SmartReplies({
  messages,
  onPick,
  currentUserNames = ["Preet Raval", "You"],
  channelName,
}: SmartRepliesProps) {
  const heuristicSuggestions = useMemo<ReplySet[]>(() => {
    if (messages.length === 0) return [];
    const last = [...messages]
      .reverse()
      .find(
        (m) =>
          m.author.id !== "me" &&
          !currentUserNames.includes(m.author.name) &&
          m.content?.trim(),
      );
    if (!last) return [];
    return suggestRepliesFor(last.content);
  }, [messages, currentUserNames]);

  const [aiSuggestions, setAiSuggestions] = useState<ReplySet[] | null>(null);

  // Fingerprint the last incoming message so we only refetch when it changes.
  const lastIncomingId = useMemo(() => {
    const last = [...messages]
      .reverse()
      .find(
        (m) =>
          m.author.id !== "me" &&
          !currentUserNames.includes(m.author.name) &&
          m.content?.trim(),
      );
    return last?.id ?? null;
  }, [messages, currentUserNames]);

  useEffect(() => {
    if (!lastIncomingId) {
      setAiSuggestions(null);
      return;
    }
    let cancelled = false;
    const previewMessages = messages
      .slice(-6)
      .map((m) => ({
        author: m.author.name,
        content: m.content,
        ts: m.createdAt,
      }))
      .filter((m) => m.content);
    fetch("/api/ai/smart-replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: previewMessages,
        userNames: currentUserNames,
        channelName,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (
          data.suggestions &&
          Array.isArray(data.suggestions) &&
          data.suggestions.length > 0 &&
          data.provider !== "demo"
        ) {
          setAiSuggestions(data.suggestions);
        } else {
          setAiSuggestions(null); // fall back to heuristic
        }
      })
      .catch(() => {
        if (!cancelled) setAiSuggestions(null);
      });
    return () => {
      cancelled = true;
    };
  }, [lastIncomingId, channelName, messages, currentUserNames]);

  const suggestions = aiSuggestions ?? heuristicSuggestions;

  return (
    <AnimatePresence>
      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.15 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px 0",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 600,
              color: "var(--vyne-accent, var(--vyne-purple))",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            <Sparkles size={11} />
            Smart reply
          </div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPick(s.text)}
              style={{
                padding: "5px 11px",
                borderRadius: 99,
                background: "rgba(108, 71, 255, 0.08)",
                border: "1px solid rgba(108, 71, 255, 0.25)",
                color: "var(--text-primary)",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 500,
                transition: "all 0.12s ease",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(108, 71, 255, 0.16)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(108, 71, 255, 0.08)";
              }}
            >
              {s.emoji && <span>{s.emoji}</span>}
              {s.text}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Heuristic reply generator — analyzes the message intent and emits
 * contextual quick-reply suggestions. Tuned to feel like Gmail Smart Reply.
 */
function suggestRepliesFor(content: string): ReplySet[] {
  const text = content.toLowerCase().trim();

  // Question pattern
  const isQuestion = /\?/.test(content) || /^(can|could|should|would|will|do|does|are|is|how|what|when|where|why)\b/i.test(text);

  // Greetings
  if (/\b(hi|hello|hey|good\s*(morning|afternoon|evening))\b/.test(text)) {
    return [
      { emoji: "👋", text: "Hey! How's it going?" },
      { text: "Hi there!" },
      { text: "Morning!" },
    ];
  }

  // Thanks
  if (/\b(thanks|thank\s*you|thx|appreciate)\b/.test(text)) {
    return [
      { emoji: "🙌", text: "You're welcome!" },
      { text: "Anytime!" },
      { text: "Happy to help" },
    ];
  }

  // Meeting / schedule
  if (/\b(meeting|call|sync|catch\s*up|schedule|calendar|huddle)\b/.test(text)) {
    return [
      { text: "Sounds good — when works?" },
      { emoji: "📅", text: "Send a calendar invite?" },
      { text: "Let me check my schedule" },
    ];
  }

  // Status / update request
  if (/\b(update|status|progress|where are we|how's it)\b/.test(text)) {
    return [
      { text: "On track — sharing details shortly" },
      { text: "Almost done, finalizing now" },
      { emoji: "🔍", text: "Will dig in and report back" },
    ];
  }

  // Approval / sign-off
  if (/\b(approve|sign\s*off|review|lgtm|ship it|good to go)\b/.test(text)) {
    return [
      { emoji: "✅", text: "Approved!" },
      { text: "LGTM" },
      { text: "Let me take a look first" },
    ];
  }

  // Bug / problem / issue
  if (/\b(bug|broken|error|fail|issue|problem|crash|doesn't work)\b/.test(text)) {
    return [
      { text: "On it — investigating now" },
      { emoji: "🔧", text: "Looking into it" },
      { text: "Got a stack trace I can see?" },
    ];
  }

  // Deadline / urgency
  if (/\b(asap|urgent|today|tomorrow|deadline|by (eod|cob))\b/.test(text)) {
    return [
      { emoji: "🚀", text: "On it" },
      { text: "Got it — prioritizing now" },
      { text: "Will have something within the hour" },
    ];
  }

  // Question / generic
  if (isQuestion) {
    return [
      { emoji: "👍", text: "Yes" },
      { text: "Let me check" },
      { text: "Not sure — can you elaborate?" },
    ];
  }

  // Default: neutral acknowledgements
  return [
    { emoji: "👍", text: "Got it" },
    { emoji: "🙏", text: "Thanks!" },
    { text: "Let me think on this" },
  ];
}
