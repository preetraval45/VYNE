// ─── Chat constants & shared types ───────────────────────────────
// Re-exported from central fixtures
export {
  COMMON_EMOJIS,
  PRESENCE_COLORS,
  SLASH_COMMANDS,
  SUMMARY_LINES,
  SUMMARY_ACTIONS,
  type SlashCmd,
  type SummaryAction,
} from "@/lib/fixtures/chat";

export interface LocalMsg {
  id: string;
  cmd: string;
  args: string;
  ts: string;
  pollVotes?: Record<string, number>;
  pollVoted?: boolean;
  loading?: boolean;
  apiResult?: { success: boolean; data: unknown; message: string } | null;
}

export const SCHEDULE_OPTS = [
  "In 1 hour",
  "Tomorrow 9am",
  "Monday 9am",
  "Next week",
];
