"use client";

import {
  Accessibility,
  Languages,
  Eye,
  Type,
  Wind,
  Link as LinkIcon,
  AlignJustify,
} from "lucide-react";
import {
  useA11y,
  type Direction,
  type TextScale,
} from "@/lib/stores/a11y";
import {
  useI18n,
  LOCALES,
  type LocaleId,
} from "@/lib/stores/i18n";
import { fmtCurrency, fmtDateTime } from "@/lib/i18n/format";
import { useT } from "@/lib/i18n/strings";
import { announce } from "@/components/layout/Announcer";

interface Props {
  onToast: (message: string) => void;
}

const TZ_OPTIONS = [
  "auto",
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney",
];

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "INR",
  "CAD",
  "AUD",
  "BRL",
  "MXN",
  "AED",
  "ILS",
];

export default function AccessibilitySettings({ onToast }: Props) {
  const a11y = useA11y();
  const i18n = useI18n();
  const t = useT();

  return (
    <div>
      {/* ── Vision (19.1 / 19.2) ────────────────────────────────── */}
      <Card title="Vision" icon={Eye}>
        <Field
          label="High-contrast mode"
          hint="Forces text to AAA contrast against the canvas. Good for low-light environments + low-vision users."
          icon={Eye}
        >
          <Toggle
            checked={a11y.highContrast}
            onChange={() => {
              a11y.set({ highContrast: !a11y.highContrast });
              announce(
                a11y.highContrast ? "High contrast off" : "High contrast on",
              );
            }}
            label={a11y.highContrast ? "On" : "Off"}
          />
        </Field>

        <Field
          label="Text size"
          hint="Independent of OS zoom — scales every UI font size."
          icon={Type}
        >
          <div style={{ display: "flex", gap: 6 }}>
            {([1, 1.25, 1.5] as TextScale[]).map((s) => (
              <Pill
                key={s}
                active={a11y.textScale === s}
                onClick={() => {
                  a11y.set({ textScale: s });
                  onToast(`Text size ${Math.round(s * 100)}%`);
                }}
              >
                {s === 1 ? "Default" : `${Math.round(s * 100)}%`}
              </Pill>
            ))}
          </div>
        </Field>

        <Field
          label="Always underline links"
          hint="Helps users who can't rely on colour alone to spot links."
          icon={LinkIcon}
        >
          <Toggle
            checked={a11y.underlineLinks}
            onChange={() =>
              a11y.set({ underlineLinks: !a11y.underlineLinks })
            }
          />
        </Field>
      </Card>

      {/* ── Motion ─────────────────────────────────────────────── */}
      <Card title="Motion" icon={Wind}>
        <Field
          label="Reduce motion"
          hint="Disables transitions and animations. Helpful for vestibular disorders or focus-friendly workflows."
          icon={Wind}
        >
          <Toggle
            checked={a11y.reduceMotion}
            onChange={() => a11y.set({ reduceMotion: !a11y.reduceMotion })}
          />
        </Field>
      </Card>

      {/* ── Layout direction (19.9) ────────────────────────────── */}
      <Card title="Reading direction" icon={AlignJustify}>
        <Field
          label="Direction"
          hint="Auto follows the chosen language. RTL languages (Arabic, Hebrew) flip layouts automatically when set to Auto."
        >
          <div style={{ display: "flex", gap: 6 }}>
            {(["auto", "ltr", "rtl"] as Direction[]).map((d) => (
              <Pill
                key={d}
                active={a11y.direction === d}
                onClick={() => a11y.set({ direction: d })}
              >
                {d.toUpperCase()}
              </Pill>
            ))}
          </div>
        </Field>
      </Card>

      {/* ── Language & locale (19.6 / 19.7 / 19.8) ─────────────── */}
      <Card title="Language & region" icon={Languages}>
        <Field
          label="Language"
          hint="Drives every Intl.* formatter, the on-device string bag, and (if enabled in AI preferences) AI replies."
        >
          <select
            aria-label="Language"
            value={i18n.locale}
            onChange={(e) => {
              i18n.set({ locale: e.target.value as LocaleId });
              onToast("Language updated");
            }}
            style={selectStyle}
          >
            {LOCALES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Currency">
          <select
            aria-label="Currency"
            value={i18n.currency}
            onChange={(e) => i18n.set({ currency: e.target.value })}
            style={selectStyle}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Timezone"
          hint="`Auto` follows the device's resolved timezone."
        >
          <select
            aria-label="Timezone"
            value={i18n.timezone}
            onChange={(e) => i18n.set({ timezone: e.target.value })}
            style={selectStyle}
          >
            {TZ_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>
                {tz === "auto" ? "Auto (device)" : tz}
              </option>
            ))}
          </select>
        </Field>

        <Field label="First day of the week">
          <div style={{ display: "flex", gap: 6 }}>
            <Pill
              active={i18n.firstDayOfWeek === 0}
              onClick={() => i18n.set({ firstDayOfWeek: 0 })}
            >
              Sunday
            </Pill>
            <Pill
              active={i18n.firstDayOfWeek === 1}
              onClick={() => i18n.set({ firstDayOfWeek: 1 })}
            >
              Monday
            </Pill>
          </div>
        </Field>

        {/* Live preview */}
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 8,
            background: "var(--content-secondary)",
            border: "1px dashed var(--content-border)",
            fontSize: 12,
            color: "var(--text-primary)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div>
            <span style={hintStyle}>Number ·</span> {fmtCurrency(1234567.89)}
          </div>
          <div>
            <span style={hintStyle}>Date ·</span> {fmtDateTime(new Date())}
          </div>
          <div>
            <span style={hintStyle}>Sample ·</span> {t("save")} · {t("cancel")}{" "}
            · {t("today")}
          </div>
        </div>
      </Card>

      <button
        type="button"
        onClick={() => {
          a11y.reset();
          i18n.reset();
          onToast("Defaults restored");
        }}
        style={ghostBtnStyle}
      >
        Restore defaults
      </button>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────
function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon size={14} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
        <strong style={{ fontSize: 13, color: "var(--text-primary)" }}>{title}</strong>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-secondary)",
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {Icon && <Icon size={12} />}
        {label}
      </label>
      {hint && (
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: "5px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
        background: active
          ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
          : "var(--content-bg)",
        color: active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--text-primary)",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        textTransform: "capitalize",
      }}
    >
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked ? "true" : "false"}
        onClick={onChange}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked
            ? "var(--vyne-accent, var(--vyne-purple))"
            : "var(--content-border)",
          position: "relative",
          cursor: "pointer",
          border: "none",
          padding: 0,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--content-bg)",
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            transition: "left 0.18s",
          }}
        />
      </button>
      {label && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>}
    </span>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 7,
  border: "1px solid var(--input-border)",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  fontSize: 12.5,
  outline: "none",
  width: "100%",
};

const hintStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginRight: 4,
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 7,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-secondary)",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
};
