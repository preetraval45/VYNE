"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Brain,
  Compass as CompassIcon,
  Flame,
  History,
  Loader2,
  Search,
  Send,
  Sparkles,
  Sunrise,
  Zap,
  Gem,
  Cpu,
  Plus,
  Trash2,
  StopCircle,
  Code,
} from "lucide-react";
import { collectVyneContext, resolveCitationHref } from "@/lib/ai/vyne-context";
import {
  computeStreak,
  isCompassFresh,
  useAiMemoryStore,
  type Session,
  type AiModel,
} from "@/lib/stores/aiMemory";
import { useAuthStore } from "@/lib/stores/auth";
import { parseArtifacts, streamVyneAI, type Artifact } from "@/lib/ai/streamClient";
import { executeToolCalls, type ToolCall, type ToolResult } from "@/lib/ai/toolExecutor";
import { ArtifactPanel } from "@/components/ai/ArtifactPanel";
import { QuickActions } from "@/components/ai/QuickActions";
import { ConversationHistory } from "@/components/ai/ConversationHistory";
import { CitationCard } from "@/components/ai/CitationCard";
import { VoiceInputButton } from "@/components/ai/VoiceInputButton";
import {
  ImageGeneratorModal,
  type AspectRatio,
} from "@/components/ai/ImageGeneratorModal";
import { ImageLightbox } from "@/components/ai/ImageLightbox";

// Vyne AI workspace-grounded mentor — morning brief + chat + compass +
// archive search + streak. All answers ground on live stores; all
// conversations are persisted so the product gets more valuable the
// longer you use it.

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ kind: string; id: string; label: string }>;
  /** Artifacts (code/markdown blocks) extracted from the assistant message. */
  artifacts?: Artifact[];
  /** Web sources from Gemini grounding (when web-search is used). */
  sources?: Array<{ title: string; url: string }>;
  /** Tool execution results (created/updated/deleted records). */
  toolResults?: ToolResult[];
  /** True while the message is still being streamed. */
  streaming?: boolean;
}

/**
 * Detects whether the user wants to MUTATE workspace records (create,
 * update, delete a deal/task/contact/etc.) rather than ask a question.
 * If matched we route through /api/ai/tools instead of the streaming
 * answer endpoint, so the model can return structured tool calls that
 * the client executes against Zustand stores.
 */
function detectMutationIntent(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  // First-word triggers — strongest signal.
  const firstWord = t.split(/\s+/)[0];
  const firstWordTriggers = new Set([
    "create", "add", "new", "make", "log", "record", "schedule",
    "update", "edit", "change", "rename", "set", "mark", "move",
    "delete", "remove", "drop", "cancel",
  ]);
  if (firstWordTriggers.has(firstWord)) {
    // Must reference an entity noun for it to be a mutation.
    const entityNouns = /\b(deal|task|issue|contact|product|invoice|supplier|work[- ]?order|opportunity|customer|sku)\b/;
    return entityNouns.test(t);
  }
  // Imperative shorthand: "/do …" or "/create …"
  if (t.startsWith("/do ") || t.startsWith("/create ") || t.startsWith("/add ")) return true;
  return false;
}

const MODELS: Array<{
  id: AiModel;
  label: string;
  hint: string;
  icon: typeof Zap;
}> = [
  // Vyne AI tiers — names hide the underlying engine.
  { id: "haiku", label: "Quick", hint: "Fast answers", icon: Zap },
  { id: "sonnet", label: "Smart", hint: "Balanced default", icon: Cpu },
  { id: "opus", label: "Deep", hint: "Long-form & reasoning", icon: Gem },
];

/**
 * Detects whether the user wants to GENERATE an image rather than ask
 * a text question. Recognized intents (case-insensitive):
 *   "generate {an?} image of X" / "{an?} image"
 *   "create / make / draw {an?} picture / image / illustration / drawing of X"
 *   "show me {an?} image / picture of X"
 *   "paint X" / "render X"
 * Returns the cleaned subject ("a dog") or null if no intent matched.
 */
function detectImageIntent(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  // Patterns: capture the "subject" phrase after the trigger.
  const patterns: Array<RegExp> = [
    /^(?:please\s+)?(?:can you\s+)?(?:generate|create|make|draw|render|paint|sketch|design|produce)\s+(?:me\s+)?(?:a|an|the\s+)?(?:image|picture|photo|photograph|illustration|drawing|painting|render(?:ing)?|sketch|art(?:work)?)\s+(?:of\s+)?(.+?)\.?\s*$/i,
    /^(?:please\s+)?(?:can you\s+)?show\s+me\s+(?:a|an|the\s+)?(?:image|picture|photo)\s+(?:of\s+)?(.+?)\.?\s*$/i,
    /^(?:i\s+want|i'd like|give me|need)\s+(?:a|an|the\s+)?(?:image|picture|photo|illustration|drawing)\s+(?:of\s+)?(.+?)\.?\s*$/i,
    /^(?:generate|create|make|draw|render|paint|sketch|design)\s+(.+?)\s+(?:image|picture|photo|illustration|drawing|art)\.?\s*$/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m && m[1]) {
      const subject = m[1].trim();
      if (subject.length > 0 && subject.length < 400) return subject;
    }
  }
  return null;
}

function extractInlineCitations(
  text: string,
): Array<{ kind: string; id: string; label: string }> {
  const re =
    /\[(project|task|deal|contact|product|invoice|employee):([^\]]+)\]/g;
  const seen = new Set<string>();
  const out: Array<{ kind: string; id: string; label: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const key = `${m[1]}:${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: m[1], id: m[2], label: m[0] });
  }
  return out;
}

const STARTER_QUESTIONS = [
  "Which of my projects are at risk right now?",
  "Which tasks are overdue and who owns them?",
  "Summarise my open CRM deals by stage and total value.",
  "What inventory items are low on stock?",
  "What should I focus on tomorrow, based on my workspace?",
];

export default function VyneAIChatPage() {
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id ?? null;
  const setCurrentUserId = useAiMemoryStore((s) => s.setCurrentUserId);

  // Tag every new write with the signed-in user's id so reads can
  // filter — keeps each user's AI history private even on a shared browser.
  useEffect(() => {
    setCurrentUserId(currentUserId);
  }, [currentUserId, setCurrentUserId]);

  const allSessions = useAiMemoryStore((s) => s.sessions);
  const allBriefs = useAiMemoryStore((s) => s.briefs);
  const compass = useAiMemoryStore((s) => s.compass);
  const allFacts = useAiMemoryStore((s) => s.facts);
  const preferredModel = useAiMemoryStore((s) => s.preferredModel);
  const addSession = useAiMemoryStore((s) => s.addSession);
  const addBrief = useAiMemoryStore((s) => s.addBrief);
  const setCompass = useAiMemoryStore((s) => s.setCompass);
  const addFact = useAiMemoryStore((s) => s.addFact);
  const removeFact = useAiMemoryStore((s) => s.removeFact);
  const setPreferredModel = useAiMemoryStore((s) => s.setPreferredModel);
  const allConversations = useAiMemoryStore((s) => s.conversations);
  const activeConvId = useAiMemoryStore((s) => s.activeConversationId);
  const createConversation = useAiMemoryStore((s) => s.createConversation);
  const appendMessage = useAiMemoryStore((s) => s.appendMessage);
  const updateLastAssistantMessage = useAiMemoryStore(
    (s) => s.updateLastAssistantMessage,
  );
  const setActiveConversation = useAiMemoryStore(
    (s) => s.setActiveConversation,
  );

  // Per-user views: only show records this user owns. Untagged legacy
  // records (no userId) are hidden so they can't leak across accounts.
  const sessions = useMemo(
    () => allSessions.filter((s) => s.userId === currentUserId),
    [allSessions, currentUserId],
  );
  const briefs = useMemo(
    () => allBriefs.filter((b) => b.userId === currentUserId),
    [allBriefs, currentUserId],
  );
  const facts = useMemo(
    () => allFacts.filter((f) => f.userId === currentUserId),
    [allFacts, currentUserId],
  );
  const conversations = useMemo(
    () => allConversations.filter((c) => c.userId === currentUserId),
    [allConversations, currentUserId],
  );

  const [historyOpen, setHistoryOpen] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lastImagePrompt, setLastImagePrompt] = useState<{
    prompt: string;
    aspectRatio: AspectRatio;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [compassDraft, setCompassDraft] = useState("");
  const [editingCompass, setEditingCompass] = useState(false);
  const [archiveQuery, setArchiveQuery] = useState("");
  const [archiveHits, setArchiveHits] = useState<
    Array<{ id: string; createdAt: string; snippet: string; reason: string }> | null
  >(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [factDraft, setFactDraft] = useState("");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const streak = useMemo(
    () => computeStreak({ sessions, briefs }),
    [sessions, briefs],
  );
  const todaysBrief = useMemo(() => {
    const today = new Date().toDateString();
    return briefs.find((b) => new Date(b.createdAt).toDateString() === today);
  }, [briefs]);
  const compassFresh = isCompassFresh(compass);

  useEffect(() => {
    inputRef.current?.focus();
    // On unmount, cancel any in-flight stream so abandoning /ai/chat
    // mid-answer doesn't keep the connection running and write stale
    // content to localStorage.
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Pre-filled query from /ai/chat?q=... — auto-asks once on mount.
  // /ai/chat?prompt=... — fills the input but does NOT auto-send, so
  // the user can finish the sentence (used by Cmd+K AI Tools entries
  // that want partial prefills like "Create a deal for ").
  const searchParams = useSearchParams();
  const prefilledQuery = searchParams?.get("q") ?? null;
  const prefilledPrompt = searchParams?.get("prompt") ?? null;
  const prefilledFiredRef = useRef(false);
  useEffect(() => {
    if (prefilledFiredRef.current) return;
    if (!prefilledQuery && !prefilledPrompt) return;
    prefilledFiredRef.current = true;
    if (prefilledQuery) {
      const t = setTimeout(() => void ask(prefilledQuery), 100);
      return () => clearTimeout(t);
    }
    if (prefilledPrompt) {
      setInput(prefilledPrompt);
      // Defer focus so the textarea is mounted.
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledQuery, prefilledPrompt]);

  // Image-edit listener — EditableImage components dispatch
  // `vyne:edit-image` events with { src, prompt }. We post a user msg
  // describing the edit + append the resulting image as the assistant
  // reply once the edit endpoint returns.
  useEffect(() => {
    function onEdit(e: Event) {
      const detail = (e as CustomEvent<{ src: string; prompt: string }>)
        .detail;
      if (!detail?.src || !detail?.prompt) return;
      void runImageEdit(detail.src, detail.prompt);
    }
    window.addEventListener("vyne:edit-image", onEdit);
    return () => window.removeEventListener("vyne:edit-image", onEdit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId]);

  const runImageEdit = useCallback(
    async (sourceImage: string, editPrompt: string) => {
      let convId = activeConvId;
      if (!convId) {
        const conv = createConversation(`Edit: ${editPrompt}`);
        convId = conv.id;
      }
      const userMsg: Msg = {
        id: crypto.randomUUID(),
        role: "user",
        content: `✨ Edit the image: ${editPrompt}\n\n![source](${sourceImage})`,
      };
      const assistantId = crypto.randomUUID();
      setMessages((m) => [
        ...m,
        userMsg,
        {
          id: assistantId,
          role: "assistant",
          content: "Editing image…",
          streaming: true,
        },
      ]);
      appendMessage(convId, { role: "user", content: userMsg.content });
      appendMessage(convId, { role: "assistant", content: "" });
      setPending(true);
      try {
        const res = await fetch("/api/ai/image-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageDataUrl: sourceImage,
            prompt: editPrompt,
          }),
        });
        const data = (await res.json()) as {
          imageDataUrl?: string | null;
          error?: string;
        };
        const reply = data.imageDataUrl
          ? `Done — here's the edited image:\n\n![edited](${data.imageDataUrl})`
          : `_Edit failed: ${data.error ?? "unknown error"}_`;
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: reply, streaming: false }
              : msg,
          ),
        );
        if (convId) {
          updateLastAssistantMessage(convId, { content: reply });
        }
      } finally {
        setPending(false);
      }
    },
    [
      activeConvId,
      createConversation,
      appendMessage,
      updateLastAssistantMessage,
    ],
  );

  // Sync messages from the active conversation when it changes (e.g.
  // user picks one from the history sidebar).
  useEffect(() => {
    if (!activeConvId) return;
    const conv = conversations.find((c) => c.id === activeConvId);
    if (!conv) return;
    setMessages(
      conv.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations,
        artifacts: parseArtifacts(m.content).artifacts,
        streaming: false,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId]);

  // Internal driver — used by ask(), regenerate(), and continue().
  // `mode = "fresh"`     → append user msg + new assistant msg.
  // `mode = "regenerate"` → keep last user msg, replace last assistant msg.
  // `mode = "continue"`   → keep last assistant msg, append a continuation.
  const drive = useCallback(
    async (
      question: string,
      mode: "fresh" | "regenerate" | "continue" = "fresh",
    ) => {
      const trimmed = question.trim();
      if (pending) return;
      if (mode === "fresh" && !trimmed) return;

      // Ensure a conversation exists.
      let convId = activeConvId;
      if (!convId) {
        const conv = createConversation(trimmed || "New conversation");
        convId = conv.id;
      }

      const assistantId = crypto.randomUUID();

      if (mode === "fresh") {
        const userMsg: Msg = {
          id: crypto.randomUUID(),
          role: "user",
          content: trimmed,
        };
        setMessages((m) => [
          ...m,
          userMsg,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            streaming: true,
          },
        ]);
        // Only append the user message to the store now — the assistant
        // message gets appended once at the end with final content. This
        // avoids the placeholder + update race that produced orphan
        // empty assistant messages in the conversation history.
        appendMessage(convId, { role: "user", content: trimmed });
      } else if (mode === "regenerate") {
        // Replace the last assistant message with a new streaming one.
        setMessages((m) => {
          const next = [...m];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === "assistant") {
              next[i] = {
                id: assistantId,
                role: "assistant",
                content: "",
                streaming: true,
              };
              break;
            }
          }
          return next;
        });
      } else {
        // continue — append a new streaming bubble; we'll append it to
        // the persisted store once at the end with final content (in
        // the finally block below).
        setMessages((m) => [
          ...m,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            streaming: true,
          },
        ]);
      }
      setInput("");
      setAttachedImages([]);
      setPending(true);

      const history = messages
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      // Build the actual prompt sent to the model based on the mode.
      const prompt =
        mode === "regenerate"
          ? // Re-ask the previous user question with a hint to vary
            (() => {
              const lastUser = [...messages]
                .reverse()
                .find((m) => m.role === "user");
              return (
                (lastUser?.content ?? trimmed) +
                "\n\n(Regenerate: provide a different perspective or approach.)"
              );
            })()
          : mode === "continue"
            ? "Please continue the previous answer where you left off, in the same style."
            : trimmed;

      // ── Mutation branch ──────────────────────────────────────────
      // If the user is asking us to create/update/delete records, route
      // through /api/ai/tools and execute the structured tool calls on
      // the client. This bypasses the streaming answer flow.
      if (mode === "fresh" && detectMutationIntent(prompt)) {
        try {
          const toolCtx = collectVyneContext();
          const toolHistory = messages.slice(-4).map((m) => ({ role: m.role, content: m.content }));
          const res = await fetch("/api/ai/tools", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: prompt, context: toolCtx, history: toolHistory }),
          });
          const data = (await res.json()) as { message?: string; toolCalls?: ToolCall[] };
          const toolCalls = Array.isArray(data.toolCalls) ? data.toolCalls : [];
          const results = toolCalls.length ? await executeToolCalls(toolCalls) : [];
          const message = data.message ?? (results.length ? "Done." : "Nothing to do.");
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: message, toolResults: results, streaming: false }
                : msg,
            ),
          );
          if (convId) {
            appendMessage(convId, { role: "assistant", content: message });
            addSession({ question: trimmed, answer: message, citations: [] });
          }
        } catch (err) {
          const failMsg = `Couldn't run tool: ${(err as Error).message ?? "unknown error"}`;
          setMessages((m) =>
            m.map((msg) => (msg.id === assistantId ? { ...msg, content: failMsg, streaming: false } : msg)),
          );
        } finally {
          setPending(false);
          abortRef.current = null;
          inputRef.current?.focus();
        }
        return;
      }

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      let reply = "";
      let collectedSources: Array<{ title: string; url: string }> = [];
      try {
        const context = collectVyneContext();
        const memoryFacts = facts.map((f) => f.text);
        for await (const chunk of streamVyneAI({
          question: prompt,
          context,
          history,
          model: preferredModel,
          memory: memoryFacts,
          images: mode === "fresh" ? attachedImages : undefined,
          signal: ctrl.signal,
        })) {
          if (chunk.type === "delta" && chunk.text) {
            reply += chunk.text;
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: reply }
                  : msg,
              ),
            );
          } else if (chunk.type === "sources" && chunk.sources) {
            // Merge unique URLs across multiple grounding chunks
            const dedup = new Map<string, { title: string; url: string }>();
            [...collectedSources, ...chunk.sources].forEach((s) => {
              if (!dedup.has(s.url)) dedup.set(s.url, s);
            });
            collectedSources = Array.from(dedup.values());
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, sources: collectedSources }
                  : msg,
              ),
            );
          } else if (chunk.type === "error") {
            reply =
              reply + `\n\n_Streaming error: ${chunk.error ?? "unknown"}_`;
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          reply =
            reply ||
            "I couldn't reach the Vyne AI service. Check your connection and try again.";
        }
      } finally {
        // If the stream finished but produced no text, surface a clear
        // error instead of an empty assistant bubble — most common cause
        // is a misconfigured / over-quota provider key.
        if (!reply.trim()) {
          reply =
            "_Vyne AI returned an empty response. This usually means the AI provider key (GEMINI_API_KEY or GROQ_API_KEY) is missing, expired, or rate-limited. Check Vercel → Settings → Environment Variables._";
        }
        const { artifacts } = parseArtifacts(reply);
        const citations = extractInlineCitations(reply);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: reply,
                  artifacts,
                  citations,
                  streaming: false,
                }
              : msg,
          ),
        );
        if (reply.trim() && convId) {
          // Persist exactly once with the final content + citations.
          if (mode === "regenerate") {
            // Replace last assistant in store
            updateLastAssistantMessage(convId, {
              content: reply,
              citations,
            });
          } else {
            // Fresh / continue — append new assistant message.
            appendMessage(convId, {
              role: "assistant",
              content: reply,
              citations,
            });
          }
          addSession({
            question: trimmed || prompt,
            answer: reply,
            citations,
          });
        }
        setPending(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [
      messages,
      pending,
      addSession,
      facts,
      preferredModel,
      activeConvId,
      createConversation,
      appendMessage,
      updateLastAssistantMessage,
    ],
  );

  const generateImage = useCallback(
    async (prompt: string, aspectRatio: AspectRatio = "1:1") => {
      const cleanPrompt = prompt.replace(/^__IMAGE__/, "").trim();
      setLastImagePrompt({ prompt: cleanPrompt, aspectRatio });
      let convId = activeConvId;
      if (!convId) {
        const conv = createConversation(cleanPrompt || "Image");
        convId = conv.id;
      }
      const userMsg: Msg = {
        id: crypto.randomUUID(),
        role: "user",
        content: cleanPrompt,
      };
      const assistantId = crypto.randomUUID();
      setMessages((m) => [
        ...m,
        userMsg,
        {
          id: assistantId,
          role: "assistant",
          content: `__GENERATING_IMAGE__${aspectRatio}`,
          streaming: true,
        },
      ]);
      appendMessage(convId, { role: "user", content: cleanPrompt });
      appendMessage(convId, { role: "assistant", content: "" });
      setInput("");
      setPending(true);
      try {
        const res = await fetch("/api/ai/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: cleanPrompt, aspectRatio }),
        });
        const data = (await res.json()) as {
          imageDataUrl?: string | null;
          error?: string;
        };
        const reply = data.imageDataUrl
          ? `Here's the image:\n\n![generated](${data.imageDataUrl})`
          : `_Image generation failed: ${data.error ?? "unknown error"}_`;
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: reply, streaming: false }
              : msg,
          ),
        );
        if (convId) {
          updateLastAssistantMessage(convId, { content: reply });
        }
      } finally {
        setPending(false);
        inputRef.current?.focus();
      }
    },
    [
      activeConvId,
      createConversation,
      appendMessage,
      updateLastAssistantMessage,
    ],
  );

  const ask = useCallback(
    (question: string) => {
      if (question.startsWith("__IMAGE__")) {
        // Open the image gen modal so the user can pick prompt + AR.
        setImageModalOpen(true);
        return Promise.resolve();
      }
      // Auto-detect image-generation intent in plain English — phrases
      // like "generate a dog image", "make an image of X", "draw a X",
      // "create a picture of X", "show me a picture of X" route to the
      // image endpoint instead of the text stream (text models describe
      // images, they don't draw them).
      const imageIntent = detectImageIntent(question);
      if (imageIntent) {
        // Pass an enriched prompt so the image model gets a richer brief.
        void generateImage(
          `A high-quality image of ${imageIntent}. Photorealistic, well-lit, detailed.`,
          "1:1",
        );
        return Promise.resolve();
      }
      return drive(question, "fresh");
    },
    [drive, generateImage],
  );

  // Re-roll listener — EditableImage dispatches `vyne:reroll-image`
  // with no payload; we re-run the last image gen prompt + AR.
  useEffect(() => {
    function onReroll() {
      if (lastImagePrompt) {
        void generateImage(lastImagePrompt.prompt, lastImagePrompt.aspectRatio);
      }
    }
    window.addEventListener("vyne:reroll-image", onReroll);
    return () => window.removeEventListener("vyne:reroll-image", onReroll);
  }, [lastImagePrompt, generateImage]);

  // Open lightbox listener — EditableImage dispatches `vyne:open-image`
  // with the src so we can render a full-screen viewer.
  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ src: string }>).detail;
      if (detail?.src) setLightboxSrc(detail.src);
    }
    window.addEventListener("vyne:open-image", onOpen);
    return () => window.removeEventListener("vyne:open-image", onOpen);
  }, []);
  const regenerate = useCallback(() => drive("", "regenerate"), [drive]);
  const continueAnswer = useCallback(() => drive("", "continue"), [drive]);
  const branchFromHere = useCallback(() => {
    // Fork: create a new conversation with the current messages copied,
    // user can keep editing from there.
    const conv = createConversation(
      messages[0]?.content ?? "Branched conversation",
    );
    for (const m of messages) {
      appendMessage(conv.id, {
        role: m.role,
        content: m.content,
        citations: m.citations,
      });
    }
    setActiveConversation(conv.id);
  }, [messages, createConversation, appendMessage, setActiveConversation]);
  const startNewConversation = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
  }, [setActiveConversation]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(false);
  }, []);

  const generateBrief = useCallback(async () => {
    setBriefLoading(true);
    try {
      const context = collectVyneContext();
      const recentSessions = sessions.slice(0, 6).map((s) => ({
        createdAt: s.createdAt,
        question: s.question,
        answer: s.answer,
      }));
      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          recentSessions,
          compass: compassFresh ? compass?.intention : undefined,
        }),
      });
      const data = (await res.json()) as {
        summary: string;
        citations?: Array<{ kind: string; id: string; label: string }>;
      };
      addBrief({ summary: data.summary ?? "", citations: data.citations });
    } finally {
      setBriefLoading(false);
    }
  }, [sessions, compass, compassFresh, addBrief]);

  const searchArchive = useCallback(async () => {
    const q = archiveQuery.trim();
    if (!q) {
      setArchiveHits(null);
      return;
    }
    setArchiveLoading(true);
    try {
      const res = await fetch("/api/ai/archive-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, sessions }),
      });
      const data = (await res.json()) as {
        hits: Array<{ id: string; createdAt: string; snippet: string; reason: string }>;
      };
      setArchiveHits(data.hits ?? []);
    } finally {
      setArchiveLoading(false);
    }
  }, [archiveQuery, sessions]);

  return (
    <div className="flex h-full" style={{ background: "var(--content-bg-secondary)" }}>
      <ConversationHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={() => {
          /* effect on activeConvId rehydrates messages */
        }}
      />
      <div className="flex flex-col h-full" style={{ flex: 1, minWidth: 0 }}>
      {/* Header */}
      <header
        style={{
          padding: "16px 24px 12px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg, var(--teal-400), var(--teal-700))",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            boxShadow: "0 8px 22px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.35)",
          }}
        >
          <Brain size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Vyne AI
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--text-tertiary)" }}>
            Grounded in your workspace · {sessions.length} session{sessions.length === 1 ? "" : "s"} remembered
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          aria-expanded={historyOpen}
          aria-label="Conversation history"
          title={`Conversation history (${conversations.length})`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            color: historyOpen ? "#fff" : "var(--text-secondary)",
            background: historyOpen
              ? "var(--vyne-teal)"
              : "var(--content-secondary)",
            border: `1px solid ${historyOpen ? "var(--vyne-teal)" : "var(--content-border)"}`,
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          <History size={12} />
          History
          {conversations.length > 0 && (
            <span
              style={{
                background: historyOpen
                  ? "rgba(255,255,255,0.22)"
                  : "var(--vyne-teal-soft)",
                color: historyOpen ? "#fff" : "var(--vyne-teal)",
                padding: "1px 6px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              {conversations.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={startNewConversation}
          aria-label="Start new conversation"
          title="New conversation"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12.5,
            color: "var(--vyne-teal)",
            background: "var(--vyne-teal-soft)",
            border: "1px solid var(--vyne-teal)",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <Plus size={12} />
          New
        </button>
        <StreakPill current={streak.current} longest={streak.longest} graceUsed={streak.graceUsed} />
        <ModelPickerPill
          value={preferredModel}
          onChange={setPreferredModel}
          open={modelMenuOpen}
          setOpen={setModelMenuOpen}
        />
        <button
          type="button"
          onClick={() => setMemoryOpen((v) => !v)}
          aria-expanded={memoryOpen}
          aria-label="Manage Vyne AI memory"
          title={`${facts.length} memory fact${facts.length === 1 ? "" : "s"}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            color: memoryOpen ? "#fff" : "var(--text-secondary)",
            background: memoryOpen
              ? "var(--vyne-teal)"
              : "var(--content-secondary)",
            border: `1px solid ${memoryOpen ? "var(--vyne-teal)" : "var(--content-border)"}`,
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          <Brain size={12} />
          Memory
          {facts.length > 0 && (
            <span
              style={{
                background: memoryOpen
                  ? "rgba(255,255,255,0.22)"
                  : "var(--vyne-teal-soft)",
                color: memoryOpen ? "#fff" : "var(--vyne-teal)",
                padding: "1px 6px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              {facts.length}
            </span>
          )}
        </button>
        <Link
          href="/ai"
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: 8,
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
          }}
        >
          Insights →
        </Link>
      </header>

      {/* Memory drawer */}
      {memoryOpen && (
        <div
          style={{
            padding: "12px 24px",
            background: "var(--content-bg)",
            borderBottom: "1px solid var(--content-border)",
          }}
        >
          <div
            style={{
              maxWidth: 820,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "var(--text-tertiary)",
              }}
            >
              Persistent facts Vyne AI remembers across sessions. Add things
              like "we use Postgres, not MySQL" or "Sarah is the design lead".
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (factDraft.trim()) {
                  addFact(factDraft);
                  setFactDraft("");
                }
              }}
              style={{ display: "flex", gap: 8 }}
            >
              <input
                value={factDraft}
                onChange={(e) => setFactDraft(e.target.value)}
                placeholder="Add a fact Vyne AI should always remember…"
                aria-label="New memory fact"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-bg)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!factDraft.trim()}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--vyne-teal)",
                  color: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: factDraft.trim() ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Plus size={13} />
                Save
              </button>
            </form>
            {facts.length > 0 && (
              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {facts.map((f) => (
                  <li
                    key={f.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      background: "var(--content-bg-secondary)",
                      border: "1px solid var(--content-border)",
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 12.5 }}>{f.text}</span>
                    <button
                      type="button"
                      onClick={() => removeFact(f.id)}
                      aria-label={`Remove fact: ${f.text}`}
                      style={{
                        width: 24,
                        height: 24,
                        border: "none",
                        background: "transparent",
                        color: "var(--text-tertiary)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 6,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div
        ref={scrollerRef}
        className="flex-1 overflow-auto content-scroll"
        style={{ padding: "20px 24px 24px" }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Morning brief */}
          <BriefCard
            brief={todaysBrief}
            loading={briefLoading}
            onGenerate={generateBrief}
          />

          {/* Compass */}
          <CompassCard
            compass={compass}
            fresh={compassFresh}
            editing={editingCompass}
            draft={compassDraft}
            onStartEdit={() => {
              setCompassDraft(compassFresh ? compass?.intention ?? "" : "");
              setEditingCompass(true);
            }}
            onCancel={() => setEditingCompass(false)}
            onSave={() => {
              const v = compassDraft.trim();
              if (!v) return;
              setCompass(v);
              setEditingCompass(false);
            }}
            onDraftChange={setCompassDraft}
          />

          {/* Archive search */}
          <ArchiveCard
            query={archiveQuery}
            setQuery={setArchiveQuery}
            hits={archiveHits}
            loading={archiveLoading}
            onSearch={searchArchive}
            sessions={sessions}
          />

          {/* Chat messages */}
          {messages.length > 0 && (
            <section>
              <h2
                style={{
                  margin: "8px 0 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                }}
              >
                This conversation
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.map((m, idx) => {
                  const isLastAssistant =
                    m.role === "assistant" &&
                    !messages
                      .slice(idx + 1)
                      .some((later) => later.role === "assistant");
                  return (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      onOpenArtifact={setActiveArtifact}
                      onRegenerate={regenerate}
                      onContinue={continueAnswer}
                      onBranch={branchFromHere}
                      isLastAssistant={isLastAssistant}
                    />
                  );
                })}
                {pending &&
                  !messages[messages.length - 1]?.streaming && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        color: "var(--text-tertiary)",
                        fontSize: 13,
                        padding: "10px 14px",
                        alignSelf: "flex-start",
                      }}
                    >
                      <Loader2 size={14} className="animate-spin" />
                      Vyne AI is thinking…
                    </div>
                  )}
              </div>
            </section>
          )}

          {/* Starter questions when empty */}
          {messages.length === 0 && (
            <section style={{ marginTop: 4 }}>
              <h2
                style={{
                  margin: "8px 0 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={12} /> Try a question
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void ask(q)}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--content-border)",
                      background: "var(--content-bg)",
                      color: "var(--text-primary)",
                      fontSize: 13.5,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Sparkles size={12} style={{ color: "var(--vyne-teal)" }} />
                    {q}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          // Only show overlay when files are images (mime check on items
          // when available, since dataTransfer.files is empty until drop).
          const items = Array.from(e.dataTransfer.items ?? []);
          const isImage = items.some(
            (i) => i.kind === "file" && i.type.startsWith("image/"),
          );
          if (isImage || (items.length === 0 && e.dataTransfer.types.includes("Files"))) {
            setDragOver(true);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          const items = Array.from(e.dataTransfer.items ?? []);
          const isImage = items.some(
            (i) => i.kind === "file" && i.type.startsWith("image/"),
          );
          if (isImage || (items.length === 0 && e.dataTransfer.types.includes("Files"))) {
            setDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (
            e.currentTarget.contains(e.relatedTarget as Node | null) === false
          ) {
            setDragOver(false);
          }
        }}
        onDrop={async (e) => {
          e.preventDefault();
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files).filter((f) =>
            f.type.startsWith("image/"),
          );
          if (files.length === 0) return;
          const dataUrls = await Promise.all(
            files.map(
              (f) =>
                new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.readAsDataURL(f);
                }),
            ),
          );
          setAttachedImages((prev) => [...prev, ...dataUrls].slice(0, 6));
        }}
        style={{
          position: "relative",
          borderTop: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          padding: "12px 24px 14px",
        }}
      >
        {dragOver && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 8,
              borderRadius: 14,
              border: "2px dashed var(--vyne-teal)",
              background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--vyne-teal)",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            Drop images to attach (max 6)
          </div>
        )}
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <QuickActions
            disabled={pending} aria-busy={pending}
            onAction={(prompt) => void ask(prompt)}
          />
        </div>
        {attachedImages.length > 0 && (
          <div
            style={{
              maxWidth: 820,
              margin: "0 auto 8px",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {attachedImages.map((src, i) => (
              <div key={i} style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`attachment ${i + 1}`}
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid var(--content-border)",
                  }}
                />
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() =>
                    setAttachedImages((prev) =>
                      prev.filter((_, j) => j !== i),
                    )
                  }
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    border: "1px solid var(--content-border)",
                    background: "var(--content-bg)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: 10,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            borderRadius: 14,
            padding: "8px 8px 8px 14px",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
            placeholder="Ask Vyne AI about your projects, tasks, deals, inventory…"
            rows={1}
            aria-label="Ask Vyne AI"
            style={{
              flex: 1,
              resize: "none",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: 14,
              padding: "8px 0",
              lineHeight: 1.45,
              maxHeight: 160,
              fontFamily: "inherit",
            }}
          />
          <label
            aria-label="Attach images for vision"
            title="Attach images (Gemini vision)"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background:
                attachedImages.length > 0
                  ? "var(--vyne-teal-soft)"
                  : "var(--content-secondary)",
              color:
                attachedImages.length > 0
                  ? "var(--vyne-teal)"
                  : "var(--text-secondary)",
              cursor: pending ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              opacity: pending ? 0.5 : 1,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            📎{attachedImages.length > 0 ? attachedImages.length : ""}
            <input
              type="file"
              multiple
              accept="image/*"
              disabled={pending} aria-busy={pending}
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                const dataUrls = await Promise.all(
                  files.map(
                    (f) =>
                      new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () =>
                          resolve(reader.result as string);
                        reader.readAsDataURL(f);
                      }),
                  ),
                );
                setAttachedImages((prev) => [...prev, ...dataUrls].slice(0, 6));
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />
          </label>
          <VoiceInputButton
            disabled={pending} aria-busy={pending}
            onTranscript={(text) => setInput(text)}
          />
          <button
            type={pending ? "button" : "submit"}
            disabled={!pending && !input.trim()}
            onClick={pending ? stopStreaming : undefined}
            aria-label={pending ? "Stop streaming" : "Send message (Enter)"}
            title={pending ? "Stop  ·  Esc" : "Send  ·  Enter"}
            className="btn-teal"
            style={{
              height: 36,
              padding: "0 14px",
              opacity: !pending && !input.trim() ? 0.5 : 1,
              cursor:
                pending || input.trim() ? "pointer" : "not-allowed",
              background: pending
                ? "linear-gradient(135deg, #f97316, #ea580c)"
                : undefined,
            }}
          >
            {pending ? <StopCircle size={14} /> : <Send size={14} />}
          </button>
        </div>
        <p
          style={{
            maxWidth: 820,
            margin: "8px auto 0",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          Every conversation is saved to your private Vyne AI memory. Tap a quick action above to generate a BRD, TRD, diagram, spreadsheet, or slide deck on demand.
        </p>
      </form>

      <ArtifactPanel
        artifact={activeArtifact}
        onClose={() => setActiveArtifact(null)}
      />

      <ImageGeneratorModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onSubmit={(p, ar) => void generateImage(p, ar)}
        initialPrompt={lastImagePrompt?.prompt ?? ""}
        initialAspectRatio={lastImagePrompt?.aspectRatio ?? "1:1"}
      />

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <style jsx global>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
      </div>
    </div>
  );
}

function ModelPickerPill({
  value,
  onChange,
  open,
  setOpen,
}: {
  value: AiModel;
  onChange: (m: AiModel) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const current = MODELS.find((m) => m.id === value) ?? MODELS[1];
  const Icon = current.icon;
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Choose Vyne AI model"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12.5,
          color: "var(--text-secondary)",
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          borderRadius: 8,
          padding: "6px 10px",
          cursor: "pointer",
        }}
      >
        <Icon size={12} />
        {current.label}
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 40,
            }}
          />
          <div
            role="menu"
            aria-label="Model options"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 41,
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 10,
              boxShadow: "var(--elev-3)",
              padding: 6,
              minWidth: 200,
            }}
          >
            {MODELS.map((m) => {
              const MIcon = m.icon;
              const active = m.id === value;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: active
                      ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
                      : "transparent",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 13,
                  }}
                >
                  <MIcon
                    size={14}
                    style={{
                      color: active
                        ? "var(--vyne-teal)"
                        : "var(--text-tertiary)",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>
                      {m.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        marginTop: 1,
                      }}
                    >
                      {m.hint}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────────────── */

function StreakPill({ current, longest, graceUsed }: { current: number; longest: number; graceUsed: boolean }) {
  if (current === 0 && longest === 0) return null;
  return (
    <span
      title={`Current streak: ${current} · longest: ${longest}${graceUsed ? " · 1 grace day used this week" : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        background: current > 0 ? "rgba(245, 158, 11, 0.14)" : "var(--content-secondary)",
        border: `1px solid ${current > 0 ? "rgba(245, 158, 11, 0.35)" : "var(--content-border)"}`,
        color: current > 0 ? "#F59E0B" : "var(--text-tertiary)",
        fontSize: 12,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <Flame size={13} />
      {current || 0}
    </span>
  );
}

function BriefCard({
  brief,
  loading,
  onGenerate,
}: {
  brief: ReturnType<typeof useAiMemoryStore.getState>["briefs"][number] | undefined;
  loading: boolean;
  onGenerate: () => void;
}) {
  return (
    <section
      style={{
        background:
          "linear-gradient(135deg, rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08), rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.02))",
        border: "1px solid rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.25)",
        borderRadius: 14,
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--vyne-teal)" }}>
          <Sunrise size={16} />
          <strong style={{ fontSize: 13, letterSpacing: "-0.005em" }}>
            {brief ? "Your morning brief" : "Generate today's brief"}
          </strong>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading} aria-busy={loading}
          className="btn-teal"
          style={{ height: 30, padding: "0 12px", fontSize: 12 }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : brief ? "Regenerate" : "Generate"}
        </button>
      </div>
      {brief ? (
        <p
          style={{
            marginTop: 10,
            marginBottom: 0,
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "var(--text-primary)",
            whiteSpace: "pre-wrap",
          }}
        >
          <AnswerWithCitations text={brief.summary} />
        </p>
      ) : (
        <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12.5, color: "var(--text-tertiary)" }}>
          One focused recommendation + the watch-outs from your workspace + a reflection question
          for tonight. Seeded by your weekly Compass.
        </p>
      )}
    </section>
  );
}

function CompassCard({
  compass,
  fresh,
  editing,
  draft,
  onStartEdit,
  onCancel,
  onSave,
  onDraftChange,
}: {
  compass: ReturnType<typeof useAiMemoryStore.getState>["compass"];
  fresh: boolean;
  editing: boolean;
  draft: string;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDraftChange: (v: string) => void;
}) {
  return (
    <section
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 14,
        padding: "14px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <CompassIcon size={14} style={{ color: "var(--vyne-teal)" }} />
          <strong style={{ fontSize: 12.5, color: "var(--text-primary)" }}>
            Weekly Compass
          </strong>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {fresh ? "this week" : compass ? "stale — set a new one" : "unset"}
          </span>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={onStartEdit}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-secondary)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {fresh ? "Edit" : "Set"}
          </button>
        )}
      </div>
      {editing ? (
        <div style={{ marginTop: 10 }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="One measurable intention for the week (e.g. close the Acme deal by Thursday)"
            aria-label="Weekly intention"
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-primary)",
              fontSize: 13.5,
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "6px 12px",
                borderRadius: 7,
                border: "1px solid var(--content-border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="btn-teal"
              style={{ height: 30, padding: "0 14px", fontSize: 12.5 }}
              disabled={!draft.trim()}
            >
              Save compass
            </button>
          </div>
        </div>
      ) : fresh && compass ? (
        <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.5 }}>
          “{compass.intention}”
        </p>
      ) : (
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--text-tertiary)" }}>
          One measurable intention for the week. Every morning brief holds you against it.
        </p>
      )}
    </section>
  );
}

function ArchiveCard({
  query,
  setQuery,
  hits,
  loading,
  onSearch,
  sessions,
}: {
  query: string;
  setQuery: (v: string) => void;
  hits: Array<{ id: string; createdAt: string; snippet: string; reason: string }> | null;
  loading: boolean;
  onSearch: () => void;
  sessions: Session[];
}) {
  if (sessions.length === 0) return null;
  return (
    <section
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 14,
        padding: "14px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <History size={14} style={{ color: "var(--vyne-teal)" }} />
        <strong style={{ fontSize: 12.5, color: "var(--text-primary)" }}>
          Ask the archive
        </strong>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          · {sessions.length} past session{sessions.length === 1 ? "" : "s"}
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
        style={{ display: "flex", gap: 8, marginTop: 8 }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 12px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
          }}
        >
          <Search size={13} style={{ color: "var(--text-tertiary)" }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. when did I last feel stuck?"
            aria-label="Search past sessions"
            style={{
              flex: 1,
              padding: "9px 0",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 13.5,
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn-teal"
          style={{ height: 36, padding: "0 14px", fontSize: 13 }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : "Search"}
        </button>
      </form>
      {hits && hits.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "10px 0 0",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {hits.map((h) => (
            <li
              key={h.id}
              style={{
                padding: "10px 12px",
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
                borderRadius: 9,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  marginBottom: 4,
                }}
              >
                <span>{new Date(h.createdAt).toLocaleString()}</span>
                <span style={{ color: "var(--vyne-teal)", fontWeight: 600 }}>{h.reason}</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--text-primary)",
                  lineHeight: 1.5,
                }}
              >
                {h.snippet}
              </p>
            </li>
          ))}
        </ul>
      )}
      {hits && hits.length === 0 && (
        <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--text-tertiary)" }}>
          Nothing relevant in your archive yet.
        </p>
      )}
    </section>
  );
}

function MessageBubble({
  message,
  onOpenArtifact,
  onRegenerate,
  onContinue,
  onBranch,
  isLastAssistant,
}: {
  message: Msg;
  onOpenArtifact?: (a: Artifact) => void;
  onRegenerate?: () => void;
  onContinue?: () => void;
  onBranch?: () => void;
  isLastAssistant?: boolean;
}) {
  const isUser = message.role === "user";
  const showActions =
    !isUser && !message.streaming && message.content.trim().length > 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: isUser
            ? "var(--content-secondary)"
            : "linear-gradient(135deg, var(--teal-400), var(--teal-700))",
          color: isUser ? "var(--text-secondary)" : "#fff",
          border: isUser ? "1px solid var(--content-border)" : "none",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {isUser ? "You" : <Brain size={14} />}
      </div>
      <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            background: isUser ? "var(--vyne-teal-soft)" : "var(--content-bg)",
            border: `1px solid ${isUser ? "var(--vyne-teal-ring)" : "var(--content-border)"}`,
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "var(--text-primary)",
            whiteSpace: "pre-wrap",
          }}
        >
          {isUser ? (
            message.content
          ) : (
            <>
              <AssistantMessage
                text={message.content}
                artifacts={message.artifacts}
                streaming={message.streaming}
                onOpenArtifact={onOpenArtifact}
              />
              {message.sources && message.sources.length > 0 && (
                <SourcePills sources={message.sources} />
              )}
              {message.toolResults && message.toolResults.length > 0 && (
                <ToolResultPills results={message.toolResults} />
              )}
            </>
          )}
        </div>
        {showActions && (
          <div
            role="toolbar"
            aria-label="Message actions"
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <MessageActionBtn
              label="Copy"
              onClick={() => {
                navigator.clipboard.writeText(message.content);
              }}
            />
            <MessageActionBtn
              label="Copy as MD"
              onClick={() => {
                // Already markdown — just copy with sources appended.
                const sources = (message.sources ?? [])
                  .map((s, i) => `[${i + 1}]: ${s.url} "${s.title}"`)
                  .join("\n");
                navigator.clipboard.writeText(
                  sources ? `${message.content}\n\n---\n${sources}` : message.content,
                );
              }}
            />
            {isLastAssistant && onRegenerate && (
              <MessageActionBtn label="↻ Regenerate" onClick={onRegenerate} />
            )}
            {isLastAssistant && onContinue && (
              <MessageActionBtn label="➕ Continue" onClick={onContinue} />
            )}
            {onBranch && (
              <MessageActionBtn label="⤴ Branch" onClick={onBranch} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SourcePills({
  sources,
}: {
  sources: Array<{ title: string; url: string }>;
}) {
  return (
    <div
      role="list"
      aria-label="Web sources"
      style={{
        marginTop: 10,
        paddingTop: 8,
        borderTop: "1px dashed var(--content-border)",
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-tertiary)",
          alignSelf: "center",
          marginRight: 4,
        }}
      >
        Sources
      </span>
      {sources.map((s, i) => {
        let host = s.url;
        try {
          host = new URL(s.url).hostname.replace(/^www\./, "");
        } catch {
          // ignore
        }
        return (
          <a
            key={`${s.url}-${i}`}
            role="listitem"
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            title={s.title}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 999,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-secondary)",
              fontSize: 11,
              fontWeight: 500,
              textDecoration: "none",
              maxWidth: 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--vyne-teal)",
              }}
            >
              [{i + 1}]
            </span>
            {host}
          </a>
        );
      })}
    </div>
  );
}

function ToolResultPills({ results }: { results: ToolResult[] }) {
  return (
    <div
      role="list"
      aria-label="Workspace changes"
      style={{
        marginTop: 10,
        paddingTop: 8,
        borderTop: "1px dashed var(--content-border)",
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-tertiary)",
          alignSelf: "center",
          marginRight: 4,
        }}
      >
        Changes
      </span>
      {results.map((r, i) => {
        const ok = r.ok;
        const Inner = (
          <>
            <span style={{ fontWeight: 700 }}>{ok ? "✓" : "✗"}</span>
            <span>{r.label}</span>
            {r.detail ? (
              <span style={{ color: "var(--text-tertiary)" }}>· {r.detail}</span>
            ) : null}
          </>
        );
        const baseStyle: React.CSSProperties = {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 9px",
          borderRadius: 999,
          border: `1px solid ${ok ? "var(--vyne-teal-ring, #99e2dc)" : "#fecaca"}`,
          background: ok ? "var(--vyne-teal-soft, #ecfeff)" : "#fef2f2",
          color: ok ? "var(--vyne-teal-deep, #0f766e)" : "#991b1b",
          fontSize: 11,
          fontWeight: 500,
          textDecoration: "none",
          maxWidth: 280,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        };
        return r.href && ok ? (
          <a key={`${r.tool}-${i}`} role="listitem" href={r.href} style={baseStyle}>
            {Inner}
          </a>
        ) : (
          <span key={`${r.tool}-${i}`} role="listitem" style={baseStyle}>
            {Inner}
          </span>
        );
      })}
    </div>
  );
}

function MessageActionBtn({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "3px 9px",
        borderRadius: 999,
        border: "1px solid var(--content-border)",
        background: "var(--content-secondary)",
        color: "var(--text-secondary)",
        fontSize: 11,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

/**
 * Renders an assistant message with inline citations + artifact placeholders.
 * Streaming messages strip fenced code blocks live (extracted to artifact pills)
 * once the closing ``` has arrived; partial blocks render as inline code while
 * the model is still typing them.
 */
function AssistantMessage({
  text,
  artifacts: cachedArtifacts,
  streaming,
  onOpenArtifact,
}: {
  text: string;
  artifacts?: Artifact[];
  streaming?: boolean;
  onOpenArtifact?: (a: Artifact) => void;
}) {
  // Image-gen skeleton — content uses the sentinel __GENERATING_IMAGE__<ar>
  // while the image is being produced.
  const imageGenMatch = text.match(/^__GENERATING_IMAGE__(\S+)/);
  if (imageGenMatch) {
    return <ImageGenSkeleton aspectRatio={imageGenMatch[1]} />;
  }

  // While streaming, parse fresh on every render so artifact pills appear
  // as soon as a fenced block closes. Once done, prefer the cached artifacts.
  const { prose, artifacts } =
    !streaming && cachedArtifacts
      ? { prose: stripArtifactsFromText(text), artifacts: cachedArtifacts }
      : parseArtifacts(text);

  return (
    <div>
      <ProseWithCitationsAndArtifacts
        text={prose}
        artifacts={artifacts}
        onOpenArtifact={onOpenArtifact}
      />
      {streaming && (
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 8,
            height: 14,
            marginLeft: 2,
            background: "var(--vyne-teal)",
            verticalAlign: "text-bottom",
            animation: "blink 1s step-end infinite",
          }}
        />
      )}
    </div>
  );
}

function ImageGenSkeleton({ aspectRatio }: { aspectRatio: string }) {
  // Map AR to width/height for the placeholder card.
  const [w, h] = (() => {
    switch (aspectRatio) {
      case "16:9":
        return [320, 180];
      case "9:16":
        return [200, 356];
      case "4:3":
        return [320, 240];
      case "3:4":
        return [240, 320];
      default:
        return [280, 280];
    }
  })();
  return (
    <div
      role="status"
      aria-label="Generating image"
      style={{
        width: w,
        height: h,
        maxWidth: "100%",
        borderRadius: 12,
        border: "1px solid var(--content-border)",
        background:
          "linear-gradient(110deg, rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10) 0%, rgba(124,77,255,0.08) 50%, rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10) 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.6s linear infinite",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: "var(--vyne-teal)",
      }}
    >
      <Sparkles size={20} />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Generating · {aspectRatio}
      </span>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

function stripArtifactsFromText(text: string): string {
  return parseArtifacts(text).prose;
}

function ProseWithCitationsAndArtifacts({
  text,
  artifacts,
  onOpenArtifact,
}: {
  text: string;
  artifacts: Artifact[];
  onOpenArtifact?: (a: Artifact) => void;
}) {
  // Split on artifact placeholders first, then within each chunk replace
  // citation tokens with chips.
  const parts = text.split(/​\[\[ARTIFACT:([^\]]+)\]\]​/);
  return (
    <>
      {parts.map((part, idx) => {
        if (idx % 2 === 1) {
          const a = artifacts.find((x) => x.id === part);
          if (!a) return null;
          return (
            <ArtifactPill
              key={`${part}-${idx}`}
              artifact={a}
              onOpen={() => onOpenArtifact?.(a)}
            />
          );
        }
        return (
          <AnswerWithCitations
            key={`text-${idx}`}
            text={part}
          />
        );
      })}
    </>
  );
}

function ArtifactPill({
  artifact,
  onOpen,
}: {
  artifact: Artifact;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "8px 0",
        padding: "10px 12px",
        background: "var(--content-bg-secondary)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        color: "var(--text-primary)",
        fontFamily: "inherit",
        fontSize: 12.5,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.12)",
          color: "var(--vyne-teal)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Code size={14} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 600 }}>
          {artifact.language || "text"} artifact
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginLeft: 8,
          }}
        >
          {artifact.content.length} chars · click to open
        </span>
      </span>
    </button>
  );
}

function AnswerWithCitations({ text }: { text: string }) {
  // Tokenize for: markdown images ![alt](url), citations [kind:id], plain text.
  type Part =
    | { type: "text"; value: string }
    | { type: "cite"; kind: string; id: string }
    | { type: "image"; alt: string; src: string };

  const parts: Part[] = [];
  const re =
    /(!\[([^\]]*)\]\((data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+|https?:\/\/[^\s)]+)\))|(\[(project|task|deal|contact|product|invoice|employee):([^\]]+)\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    if (m[1]) {
      parts.push({ type: "image", alt: m[2] || "image", src: m[3] });
    } else {
      parts.push({ type: "cite", kind: m[5], id: m[6] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });

  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "text") return <span key={i}>{p.value}</span>;
        if (p.type === "image") {
          return <EditableImage key={i} src={p.src} alt={p.alt} />;
        }
        return <CitationCard key={i} kind={p.kind} id={p.id} />;
      })}
    </>
  );
}

function EditableImage({ src, alt }: { src: string; alt: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <span style={{ display: "block", margin: "8px 0" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("vyne:open-image", { detail: { src } }),
          )
        }
        style={{
          display: "block",
          maxWidth: "100%",
          borderRadius: 12,
          border: "1px solid var(--content-border)",
          boxShadow: "var(--elev-2)",
          cursor: "zoom-in",
          transition: "transform 0.18s var(--ease-out-quart)",
        }}
      />
      <span
        style={{
          display: "flex",
          gap: 6,
          marginTop: 6,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid var(--vyne-teal)",
            background: editing ? "var(--vyne-teal)" : "var(--vyne-teal-soft)",
            color: editing ? "#fff" : "var(--vyne-teal)",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ✨ Edit with AI
        </button>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("vyne:reroll-image"))
          }
          aria-label="Re-roll: regenerate with the same prompt"
          title="Re-roll — regenerate with the same prompt"
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
            color: "var(--text-secondary)",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ↻ Re-roll
        </button>
        <a
          href={src}
          download={`vyne-image-${Date.now()}.png`}
          onClick={(e) => e.stopPropagation()}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
            color: "var(--text-secondary)",
            fontSize: 11.5,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ↓ Download
        </a>
      </span>
      {editing && (
        <span style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Describe the edit (e.g. 'change shirt to red')"
            aria-label="Image edit instruction"
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                e.preventDefault();
                window.dispatchEvent(
                  new CustomEvent("vyne:edit-image", {
                    detail: { src, prompt: draft.trim() },
                  }),
                );
                setDraft("");
                setEditing(false);
              }
            }}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-bg)",
              color: "var(--text-primary)",
              fontSize: 12.5,
              outline: "none",
            }}
          />
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("vyne:edit-image", {
                  detail: { src, prompt: draft.trim() },
                }),
              );
              setDraft("");
              setEditing(false);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              background: "var(--vyne-teal)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: draft.trim() ? "pointer" : "not-allowed",
              opacity: draft.trim() ? 1 : 0.5,
            }}
          >
            Apply
          </button>
        </span>
      )}
    </span>
  );
}
