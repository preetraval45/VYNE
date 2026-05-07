"use client";

/**
 * Smart redaction (28.4.6).
 *
 *   const findings = scanForSecrets(transcriptText);
 *   const safe = redactString(transcriptText, findings);
 *   const cleanFrame = await redactFrame(canvas, ctx, ocrResults);
 *
 * Three layers:
 *
 *   1. Text scanning — regex catalogue covering API keys (AWS / GCP /
 *      Stripe / GitHub / Slack), JWT-shaped tokens, SSNs, credit
 *      cards (Luhn check), passwords (`password=`/`pwd:`).
 *   2. String redaction — replaces matches with `••••⟨kind⟩••••` so
 *      transcripts / recap exports stay readable but safe.
 *   3. Frame redaction — given OCR boxes from the screen recording,
 *      paint black rectangles over any box whose text matches a
 *      finding. Caller wires this into the recording-export pipeline.
 *
 * Regex catalogue is intentionally tight (high precision over recall)
 * so a CSV row of phone numbers doesn't get mangled into garbage.
 * Add new patterns by appending to PATTERNS — each row carries a
 * canonical kind label that drives the replacement glyph.
 */

export type RedactionKind =
  | "aws-key"
  | "gcp-key"
  | "stripe-key"
  | "github-token"
  | "slack-token"
  | "openai-key"
  | "vyne-secret"
  | "jwt"
  | "password"
  | "ssn"
  | "credit-card"
  | "private-key"
  | "email-otp";

export interface RedactionFinding {
  kind: RedactionKind;
  /** Character offset in the source text. */
  start: number;
  end: number;
  /** The matched substring. Caller uses this for the boxes / glyph. */
  match: string;
}

interface Pattern {
  kind: RedactionKind;
  re: RegExp;
  /** Optional post-match validator (e.g. Luhn for credit cards). */
  validate?: (match: string) => boolean;
}

const PATTERNS: Pattern[] = [
  { kind: "aws-key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "gcp-key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { kind: "stripe-key", re: /\b(?:sk|pk|rk|whsec)_(?:test|live)_[0-9A-Za-z]{16,}\b/g },
  { kind: "github-token", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[0-9A-Za-z]{36,251}\b/g },
  { kind: "slack-token", re: /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/g },
  { kind: "openai-key", re: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { kind: "vyne-secret", re: /\bvyne_(?:sk|tool|gst|live)_[0-9A-Za-z_-]{16,}\b/g },
  {
    kind: "jwt",
    re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  },
  {
    kind: "password",
    re: /(?:\b(?:password|passwd|pwd)\s*[:=]\s*|"password"\s*:\s*")([^\s"&'<>]{6,64})/gi,
  },
  {
    kind: "ssn",
    re: /\b(?!000|666)([0-8]\d{2})-(?!00)\d{2}-(?!0000)\d{4}\b/g,
  },
  {
    kind: "credit-card",
    re: /\b(?:\d[ -]?){12,18}\d\b/g,
    validate: (m: string) => luhn(m.replace(/[ -]/g, "")),
  },
  {
    kind: "private-key",
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    kind: "email-otp",
    re: /\b\d{6}\b(?=\s*(?:is your|verification|code|otp))/gi,
  },
];

function luhn(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * Scan a string for known sensitive patterns. Returns every match
 * with kind + offset so the caller can either redact in place or
 * paint over the corresponding pixel region in a frame.
 */
export function scanForSecrets(text: string): RedactionFinding[] {
  if (!text) return [];
  const findings: RedactionFinding[] = [];
  for (const pat of PATTERNS) {
    pat.re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pat.re.exec(text)) !== null) {
      if (pat.validate && !pat.validate(match[0])) continue;
      findings.push({
        kind: pat.kind,
        start: match.index,
        end: match.index + match[0].length,
        match: match[0],
      });
    }
  }
  // De-duplicate overlapping ranges (keep the first by start, then longest).
  findings.sort((a, b) => (a.start - b.start) || (b.end - a.end));
  const out: RedactionFinding[] = [];
  let cursor = -1;
  for (const f of findings) {
    if (f.start < cursor) continue;
    out.push(f);
    cursor = f.end;
  }
  return out;
}

const KIND_LABEL: Record<RedactionKind, string> = {
  "aws-key": "AWS",
  "gcp-key": "GCP",
  "stripe-key": "Stripe",
  "github-token": "GitHub",
  "slack-token": "Slack",
  "openai-key": "OpenAI",
  "vyne-secret": "Vyne",
  jwt: "JWT",
  password: "password",
  ssn: "SSN",
  "credit-card": "CC",
  "private-key": "key",
  "email-otp": "OTP",
};

/**
 * Replace every finding in the source text with `••••⟨label⟩••••`.
 * Stable across calls — a redacted string passes back through
 * unchanged.
 */
export function redactString(
  text: string,
  findings?: RedactionFinding[],
): string {
  if (!text) return text;
  const matches = findings ?? scanForSecrets(text);
  if (matches.length === 0) return text;
  let out = "";
  let cursor = 0;
  for (const f of matches) {
    out += text.slice(cursor, f.start);
    out += `••••⟨${KIND_LABEL[f.kind]}⟩••••`;
    cursor = f.end;
  }
  out += text.slice(cursor);
  return out;
}

export interface OcrBox {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Paint black rectangles over any OCR box whose text matches a
 * known sensitive pattern. Caller passes the canvas + ctx that holds
 * the frame; this function mutates the canvas in place. Returns the
 * findings it acted on so the caller can log + report.
 */
export function redactFrame(
  ctx: CanvasRenderingContext2D,
  ocr: readonly OcrBox[],
): RedactionFinding[] {
  if (!ctx || ocr.length === 0) return [];
  const acted: RedactionFinding[] = [];
  ctx.save();
  ctx.fillStyle = "#000000";
  for (const box of ocr) {
    const found = scanForSecrets(box.text);
    if (found.length === 0) continue;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    acted.push(...found);
  }
  ctx.restore();
  return acted;
}

/** Predicate the recording-export UI uses to decide whether to show
 *  a "Smart redaction is on" badge. */
export function hasSensitiveContent(text: string): boolean {
  return scanForSecrets(text).length > 0;
}
