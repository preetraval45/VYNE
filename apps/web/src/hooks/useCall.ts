"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CallMode = "voice" | "video";
export type CallStatus = "idle" | "ringing" | "connecting" | "active" | "ended";

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
  assignee?: string;
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

export interface UseCallResult {
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
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteParticipants: CallParticipant[];
  transcript: TranscriptEntry[];
  liveActionItems: AiActionItem[];
  recordingUrl: string | null;
  recordingMime: string | null;
  recap: MeetingRecap | null;
  error: string | null;
  startCall: (channelId: string, channelName: string, mode: CallMode) => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  toggleRecording: () => Promise<void>;
  toggleTranscription: () => void;
  dismissRecap: () => void;
  toggleActionItem: (id: string) => void;
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

const ACTION_VERBS = [
  "will",
  "i'll",
  "we'll",
  "let's",
  "need to",
  "should",
  "must",
  "going to",
  "follow up",
  "send",
  "schedule",
  "draft",
  "review",
  "fix",
  "build",
  "ship",
];

const DEMO_PARTICIPANTS: Omit<CallParticipant, "isSpeaking">[] = [
  { id: "p1", name: "Robert Diefenderfer", isMuted: false, isVideoOff: false, isScreenSharing: false },
  { id: "p2", name: "Sarah Chen", isMuted: false, isVideoOff: true, isScreenSharing: false },
  { id: "p3", name: "Marcus Johnson", isMuted: true, isVideoOff: false, isScreenSharing: false },
];

export function useCall(): UseCallResult {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [mode, setMode] = useState<CallMode>("voice");
  const [channelId, setChannelId] = useState<string | null>(null);
  const [channelName, setChannelName] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<CallParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [liveActionItems, setLiveActionItems] = useState<AiActionItem[]>([]);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingMime, setRecordingMime] = useState<string | null>(null);
  const [recap, setRecap] = useState<MeetingRecap | null>(null);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakSimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionAlt | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const durationRef = useRef(0);
  const channelNameRef = useRef<string | null>(null);
  const remoteParticipantsRef = useRef<CallParticipant[]>([]);

  const stopAllTracks = useCallback((stream: MediaStream | null) => {
    if (!stream) return;
    stream.getTracks().forEach((t) => t.stop());
  }, []);

  const cleanup = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (speakSimRef.current) {
      clearInterval(speakSimRef.current);
      speakSimRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
  }, []);

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

  const startTranscription = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      // Browser doesn't support — fall back to demo placeholder
      const demo: TranscriptEntry = {
        id: `t-${Date.now()}`,
        speaker: "VYNE AI",
        text: "Live transcription not supported in this browser — recap will use audio recording.",
        timestamp: Date.now(),
        isFinal: true,
      };
      setTranscript([demo]);
      transcriptRef.current = [demo];
      setIsTranscribing(true);
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
      setTranscript((prev) => {
        // Drop any prior interim entries (id starts with "t-interim")
        const stable = prev.filter((p) => !p.id.startsWith("t-interim"));
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
        transcriptRef.current = next;
        return next;
      });
      // Detect action items from finals
      if (finals.length > 0) {
        const combined = finals.map((f) => f.text).join(". ");
        const items = extractActionItems(combined);
        if (items.length > 0) {
          setLiveActionItems((prev) => [
            ...prev,
            ...items.map((t, idx) => ({
              id: `ai-${Date.now()}-${idx}`,
              text: t,
              done: false,
            })),
          ]);
        }
      }
    };
    rec.onerror = () => {
      // Quietly ignore — speech recognition often errors in local dev
    };
    rec.onend = () => {
      // Auto-restart while transcribing
      if (recognitionRef.current === rec && isTranscribing) {
        try {
          rec.start();
        } catch {
          /* already started */
        }
      }
    };
    try {
      rec.start();
      recognitionRef.current = rec;
      setIsTranscribing(true);
    } catch {
      // Already started or permission denied
    }
  }, [isTranscribing]);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setIsTranscribing(false);
  }, []);

  const toggleTranscription = useCallback(() => {
    if (isTranscribing) {
      stopTranscription();
    } else {
      startTranscription();
    }
  }, [isTranscribing, startTranscription, stopTranscription]);

  const startCall = useCallback(
    async (cid: string, cname: string, m: CallMode) => {
      setError(null);
      setMode(m);
      setChannelId(cid);
      setChannelName(cname);
      setStatus("connecting");
      setDurationSec(0);
      setIsMuted(false);
      setIsVideoOff(m === "voice");
      setIsScreenSharing(false);

      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices) {
          throw new Error("Media devices not available in this browser");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: m === "video" ? { width: 640, height: 480 } : false,
        });
        setLocalStream(stream);
        channelNameRef.current = cname;
        setTranscript([]);
        transcriptRef.current = [];
        setLiveActionItems([]);
        setRecap(null);
        setRecordingUrl(null);
        setRecordingMime(null);

        // Simulate other participants joining
        const participants = DEMO_PARTICIPANTS.map((p) => ({
          ...p,
          isSpeaking: false,
        }));
        setRemoteParticipants(participants);
        remoteParticipantsRef.current = participants;

        // Brief connecting state, then active
        setTimeout(() => {
          setStatus("active");
        }, 800);

        // Tick duration
        tickRef.current = setInterval(() => {
          setDurationSec((s) => {
            const next = s + 1;
            durationRef.current = next;
            return next;
          });
        }, 1000);

        // Simulate speaking indicator rotating among participants
        speakSimRef.current = setInterval(() => {
          setRemoteParticipants((prev) => {
            if (prev.length === 0) return prev;
            const speakerIdx = Math.floor(Math.random() * prev.length);
            return prev.map((p, i) => ({
              ...p,
              isSpeaking: i === speakerIdx && !p.isMuted,
            }));
          });
        }, 1500);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to start call";
        setError(msg);
        setStatus("idle");
        setChannelId(null);
        setChannelName(null);
      }
    },
    [],
  );

  function buildRecap(): MeetingRecap {
    const finalLines = transcriptRef.current
      .filter((t) => t.isFinal)
      .map((t) => `${t.speaker}: ${t.text}`);
    const summary =
      finalLines.length > 0
        ? `Discussed ${finalLines.length} topics over ${Math.round(durationRef.current / 60)} min. Key threads: ${finalLines.slice(0, 3).join(" / ")}`
        : `Call lasted ${Math.round(durationRef.current / 60)} min. No transcription was captured — review the recording for details.`;
    const decisions = finalLines
      .filter((l) =>
        /\b(decided|agreed|going with|let's go|approved)\b/i.test(l),
      )
      .slice(0, 5);
    const participants = [
      "You",
      ...remoteParticipantsRef.current.map((p) => p.name),
    ];
    return {
      summary,
      decisions,
      actionItems: liveActionItems,
      durationSec: durationRef.current,
      participants,
      recordingUrl,
      recordingMime,
    };
  }

  const endCall = useCallback(() => {
    // Build recap before tearing down
    const finalRecap = buildRecap();
    cleanup();
    stopAllTracks(localStream);
    stopAllTracks(screenStream);
    setLocalStream(null);
    setScreenStream(null);
    setRemoteParticipants([]);
    setIsScreenSharing(false);
    setIsRecording(false);
    setIsTranscribing(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setStatus("ended");
    // Show recap after tear-down completes
    setTimeout(() => {
      setStatus("idle");
      setChannelId(null);
      setChannelName(null);
      setDurationSec(0);
      durationRef.current = 0;
      // Only show recap if there was something to capture
      if (
        finalRecap.actionItems.length > 0 ||
        finalRecap.recordingUrl ||
        transcriptRef.current.length > 0
      ) {
        setRecap(finalRecap);
      }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup, localStream, screenStream, stopAllTracks, liveActionItems, recordingUrl, recordingMime]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const next = !isMuted;
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setIsMuted(next);
  }, [localStream, isMuted]);

  const toggleVideo = useCallback(async () => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      const next = !isVideoOff;
      videoTracks.forEach((t) => {
        t.enabled = !next;
      });
      setIsVideoOff(next);
      return;
    }
    // No video track yet — request one (upgrade voice call to video)
    try {
      const vStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      vStream.getVideoTracks().forEach((t) => localStream.addTrack(t));
      setLocalStream(new MediaStream(localStream.getTracks()));
      setIsVideoOff(false);
      setMode("video");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not enable camera";
      setError(msg);
    }
  }, [localStream, isVideoOff]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopAllTracks(screenStream);
      setScreenStream(null);
      setIsScreenSharing(false);
      return;
    }
    try {
      // getDisplayMedia is only on the secure context
      const md = navigator.mediaDevices as MediaDevices & {
        getDisplayMedia?: (c?: MediaStreamConstraints) => Promise<MediaStream>;
      };
      if (!md.getDisplayMedia) {
        throw new Error("Screen sharing not supported in this browser");
      }
      const sStream = await md.getDisplayMedia({ video: true, audio: false });
      setScreenStream(sStream);
      setIsScreenSharing(true);
      // Auto-stop on browser-level "Stop sharing" click
      sStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setScreenStream(null);
        setIsScreenSharing(false);
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Screen share failed";
      setError(msg);
    }
  }, [isScreenSharing, screenStream, stopAllTracks]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }
    if (!localStream) return;
    try {
      // Combine local audio + screen video if sharing, else local stream
      const sourceStream = screenStream
        ? new MediaStream([
            ...screenStream.getVideoTracks(),
            ...localStream.getAudioTracks(),
          ])
        : localStream;
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
      const recorder = mime
        ? new MediaRecorder(sourceStream, { mimeType: mime })
        : new MediaRecorder(sourceStream);
      recordingChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordingChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, {
          type: mime || "video/webm",
        });
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        setRecordingMime(mime || "video/webm");
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Recording failed";
      setError(msg);
    }
  }, [isRecording, localStream, screenStream]);

  const dismissRecap = useCallback(() => {
    if (recordingUrl) {
      try {
        URL.revokeObjectURL(recordingUrl);
      } catch {
        /* ignore */
      }
    }
    setRecap(null);
    setRecordingUrl(null);
    setRecordingMime(null);
    setLiveActionItems([]);
    setTranscript([]);
    transcriptRef.current = [];
  }, [recordingUrl]);

  const toggleActionItem = useCallback((id: string) => {
    setLiveActionItems((prev) =>
      prev.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
    );
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      stopAllTracks(localStream);
      stopAllTracks(screenStream);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    mode,
    channelId,
    channelName,
    durationSec,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isRecording,
    isTranscribing,
    localStream,
    screenStream,
    remoteParticipants,
    transcript,
    liveActionItems,
    recordingUrl,
    recordingMime,
    recap,
    error,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleRecording,
    toggleTranscription,
    dismissRecap,
    toggleActionItem,
  };
}
