"use client";

import { create } from "zustand";

export type CallMode = "voice" | "video" | "solo";
export type CallStatus = "idle" | "connecting" | "active" | "ended";

export interface CallParticipant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
}

export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface AiActionItem {
  id: string;
  text: string;
  done: boolean;
}

export interface MeetingRecap {
  summary: string;
  decisions: string[];
  actionItems: AiActionItem[];
  durationSec: number;
  participants: string[];
  recordingUrl: string | null;
  recordingMime: string | null;
}

interface SpeechRecognitionAlt extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((this: SpeechRecognitionAlt, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionAlt, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionAlt, ev: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionAlt;
}

interface CallState {
  status: CallStatus;
  mode: CallMode;
  channelId: string | null;
  channelName: string | null;
  durationSec: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  isMinimized: boolean;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteParticipants: CallParticipant[];
  transcript: TranscriptEntry[];
  liveActionItems: AiActionItem[];
  recordingUrl: string | null;
  recordingMime: string | null;
  recap: MeetingRecap | null;
  error: string | null;

  startCall: (
    channelId: string,
    channelName: string,
    mode: CallMode,
  ) => Promise<void>;
  startSoloRecording: () => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  toggleRecording: () => Promise<void>;
  toggleTranscription: () => void;
  toggleMinimize: () => void;
  dismissRecap: () => void;
  toggleActionItem: (id: string) => void;
  clearError: () => void;
  _tick: () => void;
  _rotateSpeaker: () => void;
}

const DEMO_PARTICIPANTS: Omit<CallParticipant, "isSpeaking">[] = [
  { id: "p1", name: "Robert Diefenderfer", isMuted: false, isVideoOff: false, isScreenSharing: false },
  { id: "p2", name: "Sarah Chen", isMuted: false, isVideoOff: true, isScreenSharing: false },
  { id: "p3", name: "Marcus Johnson", isMuted: true, isVideoOff: false, isScreenSharing: false },
];

const ACTION_VERBS = [
  "will","i'll","we'll","let's","need to","should","must","going to",
  "follow up","send","schedule","draft","review","fix","build","ship",
];

// Module-scoped refs — outside the store because MediaStream / MediaRecorder
// can't survive serialization, and we want them stable across rerenders.
let tickInterval: ReturnType<typeof setInterval> | null = null;
let speakInterval: ReturnType<typeof setInterval> | null = null;
let recorder: MediaRecorder | null = null;
let recordingChunks: Blob[] = [];
let recognition: SpeechRecognitionAlt | null = null;

function stopAllTracks(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* ignore */
    }
  });
}

function clearTimers() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  if (speakInterval) {
    clearInterval(speakInterval);
    speakInterval = null;
  }
}

function extractActionItems(text: string): string[] {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const items: string[] = [];
  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (ACTION_VERBS.some((v) => lower.includes(v)) && s.length > 8) {
      items.push(s);
    }
  }
  return items;
}

export const useCallStore = create<CallState>((set, get) => ({
  status: "idle",
  mode: "voice",
  channelId: null,
  channelName: null,
  durationSec: 0,
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  isRecording: false,
  isTranscribing: false,
  isMinimized: false,
  localStream: null,
  screenStream: null,
  remoteParticipants: [],
  transcript: [],
  liveActionItems: [],
  recordingUrl: null,
  recordingMime: null,
  recap: null,
  error: null,

  _tick: () => set((s) => ({ durationSec: s.durationSec + 1 })),
  _rotateSpeaker: () =>
    set((s) => {
      if (s.remoteParticipants.length === 0) return {};
      const idx = Math.floor(Math.random() * s.remoteParticipants.length);
      return {
        remoteParticipants: s.remoteParticipants.map((p, i) => ({
          ...p,
          isSpeaking: i === idx && !p.isMuted,
        })),
      };
    }),

  startCall: async (channelId, channelName, mode) => {
    // If already in a call, ignore
    if (get().status !== "idle" && get().status !== "ended") return;

    const isSolo = mode === "solo";
    set({
      status: "connecting",
      mode,
      channelId,
      channelName,
      durationSec: 0,
      isMuted: false,
      isVideoOff: mode === "voice",
      isScreenSharing: false,
      isRecording: false,
      isTranscribing: false,
      isMinimized: false,
      transcript: [],
      liveActionItems: [],
      recordingUrl: null,
      recordingMime: null,
      recap: null,
      error: null,
    });

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        throw new Error("Media devices not available — check browser support");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video:
          mode === "video" || mode === "solo"
            ? { width: 640, height: 480 }
            : false,
      });

      // Solo mode = no simulated participants — it's just the user
      const participants = isSolo
        ? []
        : DEMO_PARTICIPANTS.map((p) => ({
            ...p,
            isSpeaking: false,
          }));

      set({
        localStream: stream,
        remoteParticipants: participants,
      });

      // Brief connecting state before "active" — gives the dialing feeling
      setTimeout(() => {
        if (get().status === "connecting") {
          set({ status: "active" });
        }
      }, 700);

      // Kick off duration ticker
      clearTimers();
      tickInterval = setInterval(() => {
        const cur = get();
        if (cur.status !== "active" && cur.status !== "connecting") {
          clearTimers();
          return;
        }
        cur._tick();
      }, 1000);

      // Kick off speaking-indicator simulation
      speakInterval = setInterval(() => {
        const cur = get();
        if (cur.status !== "active") return;
        cur._rotateSpeaker();
      }, 1500);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Failed to start call";
      const friendly =
        raw.includes("Permission") || raw.includes("denied")
          ? "Microphone/camera access denied. Please allow permissions in your browser and try again."
          : raw.includes("not available") || raw.includes("not supported")
            ? raw
            : `Couldn't start call: ${raw}`;
      set({
        status: "idle",
        channelId: null,
        channelName: null,
        error: friendly,
      });
    }
  },

  startSoloRecording: async () => {
    // Spin up a "self call" — user records themselves (camera + screen share + voice)
    // for presentation videos, demo recordings, async standups, etc.
    await get().startCall("__solo__", "Solo Recording", "solo");
    // Once connected, auto-enable transcription
    setTimeout(() => {
      const cur = get();
      if (cur.status !== "active" && cur.status !== "connecting") return;
      if (!cur.isTranscribing) cur.toggleTranscription();
    }, 1000);
  },

  endCall: () => {
    const s = get();
    clearTimers();

    // Stop transcription
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      recognition = null;
    }

    // Stop recording
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }

    // Build recap from final transcript
    const finalLines = s.transcript
      .filter((t) => t.isFinal)
      .map((t) => `${t.speaker}: ${t.text}`);
    const summary =
      finalLines.length > 0
        ? `Discussed ${finalLines.length} topics over ${Math.max(1, Math.round(s.durationSec / 60))} min. Key threads: ${finalLines.slice(0, 3).join(" / ")}`
        : `Call lasted ${formatHm(s.durationSec)}. Recording${s.recordingUrl ? " saved" : " not captured"} — ${s.transcript.length === 0 ? "enable AI Notes next time for a transcript." : "review the transcript above."}`;
    const decisions = finalLines
      .filter((l) => /\b(decided|agreed|going with|let's go|approved)\b/i.test(l))
      .slice(0, 5);
    const recap: MeetingRecap = {
      summary,
      decisions,
      actionItems: s.liveActionItems,
      durationSec: s.durationSec,
      participants: ["You", ...s.remoteParticipants.map((p) => p.name)],
      recordingUrl: s.recordingUrl,
      recordingMime: s.recordingMime,
    };

    stopAllTracks(s.localStream);
    stopAllTracks(s.screenStream);

    set({
      status: "ended",
      localStream: null,
      screenStream: null,
      remoteParticipants: [],
      isScreenSharing: false,
      isRecording: false,
      isTranscribing: false,
      isMuted: false,
      isVideoOff: false,
    });

    // Show recap if there's anything worth showing
    setTimeout(() => {
      const stillEnded = get().status === "ended";
      if (!stillEnded) return;
      const hasContent =
        s.transcript.length > 0 ||
        s.liveActionItems.length > 0 ||
        Boolean(s.recordingUrl) ||
        s.durationSec > 5;
      set({
        status: "idle",
        channelId: null,
        channelName: null,
        durationSec: 0,
        recap: hasContent ? recap : null,
      });
    }, 250);
  },

  toggleMute: () => {
    const s = get();
    if (!s.localStream) return;
    const next = !s.isMuted;
    s.localStream.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    set({ isMuted: next });
  },

  toggleVideo: async () => {
    const s = get();
    if (!s.localStream) return;
    const videoTracks = s.localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      const next = !s.isVideoOff;
      videoTracks.forEach((t) => {
        t.enabled = !next;
      });
      set({ isVideoOff: next });
      return;
    }
    // No video track — request camera (upgrade voice → video)
    try {
      const vStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      vStream.getVideoTracks().forEach((t) => s.localStream!.addTrack(t));
      set({
        localStream: new MediaStream(s.localStream.getTracks()),
        isVideoOff: false,
        mode: "video",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't enable camera";
      set({ error: msg });
    }
  },

  toggleScreenShare: async () => {
    const s = get();
    if (s.isScreenSharing) {
      stopAllTracks(s.screenStream);
      set({ screenStream: null, isScreenSharing: false });
      return;
    }
    try {
      const md = navigator.mediaDevices as MediaDevices & {
        getDisplayMedia?: (c?: MediaStreamConstraints) => Promise<MediaStream>;
      };
      if (!md.getDisplayMedia) {
        throw new Error("Screen sharing isn't supported in this browser");
      }
      const sStream = await md.getDisplayMedia({ video: true, audio: false });
      set({ screenStream: sStream, isScreenSharing: true });
      sStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        set({ screenStream: null, isScreenSharing: false });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Screen share failed";
      set({ error: msg });
    }
  },

  toggleRecording: async () => {
    const s = get();
    if (s.isRecording) {
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
      set({ isRecording: false });
      return;
    }
    if (!s.localStream) return;
    try {
      const sourceStream = s.screenStream
        ? new MediaStream([
            ...s.screenStream.getVideoTracks(),
            ...s.localStream.getAudioTracks(),
          ])
        : s.localStream;
      const mimeCandidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "audio/webm",
      ];
      const mime =
        mimeCandidates.find(
          (m) =>
            typeof MediaRecorder !== "undefined" &&
            MediaRecorder.isTypeSupported(m),
        ) ?? "";
      const r = mime
        ? new MediaRecorder(sourceStream, { mimeType: mime })
        : new MediaRecorder(sourceStream);
      recordingChunks = [];
      r.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordingChunks.push(ev.data);
      };
      r.onstop = () => {
        const blob = new Blob(recordingChunks, {
          type: mime || "video/webm",
        });
        const url = URL.createObjectURL(blob);
        set({ recordingUrl: url, recordingMime: mime || "video/webm" });
      };
      r.start(1000);
      recorder = r;
      set({ isRecording: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Recording failed";
      set({ error: msg });
    }
  },

  toggleTranscription: () => {
    const s = get();
    if (s.isTranscribing) {
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          /* ignore */
        }
        recognition = null;
      }
      set({ isTranscribing: false });
      return;
    }
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      const demo: TranscriptEntry = {
        id: `t-${Date.now()}`,
        speaker: "VYNE AI",
        text: "Live transcription not supported in this browser. Recap will use the recording instead.",
        timestamp: Date.now(),
        isFinal: true,
      };
      set({ transcript: [demo], isTranscribing: true });
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (ev: Event) => {
      const e = ev as unknown as {
        resultIndex: number;
        results: ArrayLike<{
          isFinal: boolean;
          0: { transcript: string };
        }>;
      };
      let interim = "";
      const finals: TranscriptEntry[] = [];
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript.trim();
        if (!text) continue;
        if (r.isFinal) {
          finals.push({
            id: `t-${Date.now()}-${i}`,
            speaker: "You",
            text,
            timestamp: Date.now(),
            isFinal: true,
          });
        } else {
          interim += text + " ";
        }
      }
      set((cur) => {
        const stable = cur.transcript.filter(
          (p) => !p.id.startsWith("t-interim"),
        );
        const next = [...stable, ...finals];
        if (interim.trim()) {
          next.push({
            id: `t-interim-${Date.now()}`,
            speaker: "You",
            text: interim.trim(),
            timestamp: Date.now(),
            isFinal: false,
          });
        }
        const newActions =
          finals.length > 0
            ? extractActionItems(finals.map((f) => f.text).join(". "))
            : [];
        return {
          transcript: next,
          liveActionItems: [
            ...cur.liveActionItems,
            ...newActions.map((t, idx) => ({
              id: `ai-${Date.now()}-${idx}`,
              text: t,
              done: false,
            })),
          ],
        };
      });
    };
    rec.onerror = () => {
      /* swallow */
    };
    rec.onend = () => {
      if (recognition === rec && get().isTranscribing) {
        try {
          rec.start();
        } catch {
          /* already started */
        }
      }
    };
    try {
      rec.start();
      recognition = rec;
      set({ isTranscribing: true });
    } catch {
      /* permission denied or already running */
    }
  },

  toggleMinimize: () => set((s) => ({ isMinimized: !s.isMinimized })),

  dismissRecap: () =>
    set((s) => {
      if (s.recordingUrl) {
        try {
          URL.revokeObjectURL(s.recordingUrl);
        } catch {
          /* ignore */
        }
      }
      return {
        recap: null,
        recordingUrl: null,
        recordingMime: null,
        liveActionItems: [],
        transcript: [],
      };
    }),

  toggleActionItem: (id) =>
    set((s) => ({
      liveActionItems: s.liveActionItems.map((a) =>
        a.id === id ? { ...a, done: !a.done } : a,
      ),
    })),

  clearError: () => set({ error: null }),
}));

function formatHm(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}
