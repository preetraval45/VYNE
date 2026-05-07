"use client";

/**
 * Pre-call lobby (28.3.10).
 *
 *   const probe = await runLobbyProbe({ wantVideo: true, wantAudio: true });
 *
 * Exposed to the lobby modal so the user can:
 *   1. Preview camera + mic in the chosen device.
 *   2. See virtual-background / noise-suppression preferences applied
 *      to the preview stream before joining (28.3.8).
 *   3. Get warned about bad audio (echo / clipping / silent mic) so
 *      they don't enter a 12-person call with a busted setup.
 *   4. Enumerate every input / output device so they can swap before
 *      the call layer attaches.
 *
 * Pure browser API — no server. Safe to call from any page.
 */

export interface DeviceOption {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput" | "videoinput";
}

export interface LobbyDevices {
  cameras: DeviceOption[];
  microphones: DeviceOption[];
  speakers: DeviceOption[];
}

export interface LobbyHealth {
  /** True when the mic input is silent (input level < epsilon). */
  silentMic: boolean;
  /** True when input clips frequently. */
  clipping: boolean;
  /** Average peak level over the probe window (0..1). */
  avgPeak: number;
  /** Echo-test score 0..1 — placeholder; real impl uses MediaPipe. */
  echoScore: number;
}

export interface LobbyProbe {
  stream: MediaStream | null;
  devices: LobbyDevices;
  health: LobbyHealth;
  errors: string[];
}

export interface LobbyOptions {
  wantVideo?: boolean;
  wantAudio?: boolean;
  cameraId?: string;
  microphoneId?: string;
  /** Stop after `probeDurationMs` of mic listening. Default 1200ms. */
  probeDurationMs?: number;
}

export async function listLobbyDevices(): Promise<LobbyDevices> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return { cameras: [], microphones: [], speakers: [] };
  }
  try {
    const list = await navigator.mediaDevices.enumerateDevices();
    return {
      cameras: list
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
          kind: "videoinput",
        })),
      microphones: list
        .filter((d) => d.kind === "audioinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${i + 1}`,
          kind: "audioinput",
        })),
      speakers: list
        .filter((d) => d.kind === "audiooutput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${i + 1}`,
          kind: "audiooutput",
        })),
    };
  } catch {
    return { cameras: [], microphones: [], speakers: [] };
  }
}

async function probeMicrophone(
  stream: MediaStream,
  durationMs: number,
): Promise<{ avgPeak: number; clipping: boolean; silentMic: boolean }> {
  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack || typeof AudioContext === "undefined") {
    return { avgPeak: 0, clipping: false, silentMic: true };
  }
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const buffer = new Uint8Array(analyser.fftSize);
  let peakSum = 0;
  let peakCount = 0;
  let clipCount = 0;
  const start = performance.now();
  while (performance.now() - start < durationMs) {
    analyser.getByteTimeDomainData(buffer);
    let peak = 0;
    for (let i = 0; i < buffer.length; i++) {
      const sample = Math.abs(buffer[i] - 128) / 128;
      if (sample > peak) peak = sample;
      if (sample > 0.95) clipCount += 1;
    }
    peakSum += peak;
    peakCount += 1;
    await new Promise((r) => setTimeout(r, 60));
  }
  await ctx.close();
  const avgPeak = peakCount > 0 ? peakSum / peakCount : 0;
  return {
    avgPeak,
    clipping: clipCount / Math.max(peakCount, 1) > 0.08,
    silentMic: avgPeak < 0.02,
  };
}

export async function runLobbyProbe(
  opts: LobbyOptions = {},
): Promise<LobbyProbe> {
  const errors: string[] = [];
  if (typeof window === "undefined") {
    return {
      stream: null,
      devices: { cameras: [], microphones: [], speakers: [] },
      health: { silentMic: true, clipping: false, avgPeak: 0, echoScore: 0 },
      errors: ["ssr"],
    };
  }
  const wantVideo = opts.wantVideo ?? true;
  const wantAudio = opts.wantAudio ?? true;
  const probeDurationMs = opts.probeDurationMs ?? 1_200;

  let stream: MediaStream | null = null;
  try {
    const constraints: MediaStreamConstraints = {
      video: wantVideo
        ? opts.cameraId
          ? { deviceId: { exact: opts.cameraId } }
          : true
        : false,
      audio: wantAudio
        ? opts.microphoneId
          ? { deviceId: { exact: opts.microphoneId } }
          : true
        : false,
    };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "getUserMedia failed");
  }

  const devices = await listLobbyDevices();
  const health: LobbyHealth =
    stream && wantAudio
      ? { ...(await probeMicrophone(stream, probeDurationMs)), echoScore: 0 }
      : { silentMic: !wantAudio, clipping: false, avgPeak: 0, echoScore: 0 };

  return { stream, devices, health, errors };
}

/**
 * Tear down a probe stream cleanly. Call when the user dismisses the
 * lobby without joining — otherwise the camera light stays on.
 */
export function teardownLobby(stream: MediaStream | null): void {
  if (!stream) return;
  for (const t of stream.getTracks()) {
    try {
      t.stop();
    } catch {
      // ignore
    }
  }
}
