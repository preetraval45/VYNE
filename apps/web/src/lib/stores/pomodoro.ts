import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PomodoroPhase = "focus" | "shortBreak" | "longBreak";

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  soundOn: boolean;
}

interface PomodoroStore {
  // Config
  settings: PomodoroSettings;

  // Runtime
  running: boolean;
  phase: PomodoroPhase;
  /** Seconds remaining in current phase. */
  remainingSec: number;
  /** Number of completed focus sessions in the current streak. */
  completedFocusCount: number;
  /** ISO timestamp when the current phase started; null when paused. */
  startedAt: string | null;

  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  tick: () => void;
  updateSettings: (patch: Partial<PomodoroSettings>) => void;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  soundOn: true,
};

function phaseMinutes(phase: PomodoroPhase, s: PomodoroSettings): number {
  if (phase === "focus") return s.focusMinutes;
  if (phase === "shortBreak") return s.shortBreakMinutes;
  return s.longBreakMinutes;
}

function nextPhase(
  current: PomodoroPhase,
  completedFocus: number,
  longEvery: number,
): PomodoroPhase {
  if (current === "focus") {
    return completedFocus > 0 && completedFocus % longEvery === 0
      ? "longBreak"
      : "shortBreak";
  }
  return "focus";
}

export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      running: false,
      phase: "focus",
      remainingSec: DEFAULT_SETTINGS.focusMinutes * 60,
      completedFocusCount: 0,
      startedAt: null,

      start: () =>
        set((state) => ({
          running: true,
          startedAt: new Date().toISOString(),
          remainingSec:
            state.remainingSec > 0
              ? state.remainingSec
              : phaseMinutes(state.phase, state.settings) * 60,
        })),

      pause: () =>
        set(() => ({ running: false, startedAt: null })),

      reset: () =>
        set((state) => ({
          running: false,
          startedAt: null,
          remainingSec: phaseMinutes(state.phase, state.settings) * 60,
        })),

      skip: () => {
        const s = get();
        const completed =
          s.phase === "focus" ? s.completedFocusCount + 1 : s.completedFocusCount;
        const np = nextPhase(s.phase, completed, s.settings.longBreakEvery);
        set({
          phase: np,
          remainingSec: phaseMinutes(np, s.settings) * 60,
          completedFocusCount: completed,
          running: false,
          startedAt: null,
        });
      },

      tick: () => {
        const s = get();
        if (!s.running) return;
        const next = s.remainingSec - 1;
        if (next > 0) {
          set({ remainingSec: next });
          return;
        }
        // Phase complete
        const completed =
          s.phase === "focus" ? s.completedFocusCount + 1 : s.completedFocusCount;
        const np = nextPhase(s.phase, completed, s.settings.longBreakEvery);

        // Play a chime
        if (s.settings.soundOn && typeof window !== "undefined") {
          try {
            const AudioCtx =
              window.AudioContext ??
              (window as unknown as { webkitAudioContext: typeof AudioContext })
                .webkitAudioContext;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = np === "focus" ? 440 : 660;
            gain.gain.value = 0.15;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            setTimeout(() => {
              osc.stop();
              ctx.close().catch(() => {});
            }, 260);
          } catch {
            // ignore
          }
        }

        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(
              np === "focus" ? "Break over — back to work" : "Time for a break",
              { body: `${s.phase === "focus" ? "Focus" : "Break"} session complete.` },
            );
          } catch {
            // ignore
          }
        }

        set({
          phase: np,
          remainingSec: phaseMinutes(np, s.settings) * 60,
          completedFocusCount: completed,
          running: false,
          startedAt: null,
        });
      },

      updateSettings: (patch) =>
        set((state) => {
          const merged = { ...state.settings, ...patch };
          // Keep the current phase in sync with new length when paused
          const newRemaining =
            state.running || state.startedAt
              ? state.remainingSec
              : phaseMinutes(state.phase, merged) * 60;
          return { settings: merged, remainingSec: newRemaining };
        }),
    }),
    {
      name: "vyne-pomodoro",
      partialize: (state) => ({
        settings: state.settings,
        phase: state.phase,
        remainingSec: state.remainingSec,
        completedFocusCount: state.completedFocusCount,
      }),
    },
  ),
);
