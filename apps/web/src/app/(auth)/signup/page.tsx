"use client";

import { useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  UserCircle,
  ShoppingCart,
  Package,
  BarChart3,
  Bot,
  MessageSquare,
  FolderKanban,
  FileText,
  Receipt,
  Factory,
  Megaphone,
  Headphones,
  Eye as EyeIcon,
  Users,
  Wrench,
  Layers,
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";
import { VyneLogo } from "@/components/brand/VyneLogo";
import {
  PASSWORD_RULES,
  validatePassword,
} from "@/lib/auth/localAccounts";
import { clearDemoSession } from "@/lib/stores/seedMode";

interface ModuleOption {
  id: string;
  name: string;
  desc: string;
  icon: React.ElementType;
  color: string;
}

const MODULES: ModuleOption[] = [
  { id: "crm", name: "CRM", desc: "Pipeline, deals, customers", icon: UserCircle, color: "#8B5CF6" },
  { id: "sales", name: "Sales", desc: "Quotes, orders, opportunities", icon: ShoppingCart, color: "#06B6D4" },
  { id: "invoicing", name: "Invoicing", desc: "Bills, payments, receipts", icon: Receipt, color: "#14B8A6" },
  { id: "finance", name: "Finance", desc: "Accounting, P&L, expenses", icon: BarChart3, color: "#EF4444" },
  { id: "erp", name: "ERP / Inventory", desc: "Stock, orders, suppliers", icon: Package, color: "#F59E0B" },
  { id: "manufacturing", name: "Manufacturing", desc: "BOM, work orders", icon: Factory, color: "#F97316" },
  { id: "projects", name: "Projects", desc: "Kanban, sprints, issues", icon: FolderKanban, color: "#3B82F6" },
  { id: "chat", name: "Messaging", desc: "Team chat, channels, DMs", icon: MessageSquare, color: "#06B6D4" },
  { id: "docs", name: "Documents", desc: "Wiki, notes, knowledge base", icon: FileText, color: "#22C55E" },
  { id: "ai", name: "AI Assistant", desc: "Smart alerts, AI agents", icon: Bot, color: "#22D3EE" },
  { id: "marketing", name: "Marketing", desc: "Campaigns, analytics", icon: Megaphone, color: "#EC4899" },
  { id: "hr", name: "HR & People", desc: "Team, payroll, leave", icon: Users, color: "#A855F7" },
  { id: "support", name: "Support", desc: "Tickets, SLA, knowledge", icon: Headphones, color: "#0EA5E9" },
  { id: "maintenance", name: "Maintenance", desc: "Equipment, schedules", icon: Wrench, color: "#78716C" },
  { id: "observe", name: "Observability", desc: "Metrics, logs, alerts", icon: EyeIcon, color: "#64748B" },
];

interface PlanPreset {
  id: string;
  name: string;
  tagline: string;
  modules: string[];
  recommended?: boolean;
}

const PLANS: PlanPreset[] = [
  {
    id: "crm-only",
    name: "CRM only",
    tagline: "Just the pipeline — deals, contacts, AI helper.",
    modules: ["crm", "ai"],
  },
  {
    id: "sales-suite",
    name: "Sales suite",
    tagline: "CRM + Sales + Invoicing + AI.",
    modules: ["crm", "sales", "invoicing", "ai"],
    recommended: true,
  },
  {
    id: "ops",
    name: "Operations",
    tagline: "Projects, Chat, Docs, AI — replace Slack + Jira + Notion.",
    modules: ["projects", "chat", "docs", "ai"],
  },
  {
    id: "full",
    name: "Full company OS",
    tagline: "Every module — run the whole business on VYNE.",
    modules: MODULES.map((m) => m.id),
  },
  {
    id: "custom",
    name: "Custom",
    tagline: "Pick exactly what you need.",
    modules: [],
  },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
  fontSize: 14,
  outline: "none",
};

export default function SignupPage() {
  const router = useRouter();
  const { setUser, setToken, setRefreshToken } = useAuthStore();

  const [step, setStep] = useState<0 | 1 | 2>(0);

  // Step 0 — credentials
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 1 — plan
  const [planId, setPlanId] = useState<string>("sales-suite");

  // Step 2 — custom module picker (only used when planId === 'custom')
  const [customModules, setCustomModules] = useState<Set<string>>(
    new Set(["crm", "ai"]),
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pwCheck = useMemo(() => validatePassword(password), [password]);
  const pwMatch = password.length > 0 && password === confirm;

  const credentialsValid =
    name.trim().length >= 2 &&
    companyName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    pwCheck.valid &&
    pwMatch;

  const selectedPlan = PLANS.find((p) => p.id === planId) ?? PLANS[1];
  const finalModules =
    planId === "custom" ? Array.from(customModules) : selectedPlan.modules;

  function toggleCustom(id: string) {
    setCustomModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate(e?: FormEvent) {
    e?.preventDefault();
    if (submitting) return;
    setError(null);

    if (planId === "custom" && finalModules.length === 0) {
      setError("Pick at least one module to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name,
          email,
          password,
          companyName,
          modules: finalModules,
          plan: planId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        token?: string;
        user?: {
          id: string;
          email: string;
          name: string;
          companyName: string;
          modules: string[];
          plan: string;
          role: "owner" | "admin" | "member" | "viewer";
          orgId: string;
          createdAt: string;
        };
      };
      if (!res.ok || !data.user || !data.token) {
        throw new Error(data.error ?? "Could not create account");
      }

      // Brand-new account → clear any leftover demo seed flag so this
      // user lands on a clean workspace with no fake inventory.
      clearDemoSession();
      // Also wipe stores that may have been hydrated with fixtures
      // during a prior demo browse on this device.
      try {
        ["vyne-crm", "vyne-ops", "vyne-finance", "vyne-expenses", "vyne-invoicing", "vyne-projects"].forEach(
          (key) => localStorage.removeItem(key),
        );
      } catch {
        /* storage disabled — best-effort */
      }
      // Wire the new account into the auth store + persistent module list
      // so the sidebar and dashboard render only what was selected. The
      // HttpOnly auth cookie was set by the API itself.
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        orgId: data.user.orgId,
        role: data.user.role,
        createdAt: data.user.createdAt,
      });
      setToken(data.token);
      setRefreshToken(data.token);
      localStorage.setItem("vyne-modules", JSON.stringify(data.user.modules));
      localStorage.setItem("vyne-onboarded", "true");
      localStorage.setItem(
        "vyne-onboarding",
        JSON.stringify({
          company: { companyName, industry: "", size: "", useCase: "" },
          modules: data.user.modules,
          invites: [],
        }),
      );

      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #07061A 0%, #0D0B24 50%, #07061A 100%)",
        fontFamily: "var(--font-display)",
      }}
    >
      <div
        aria-hidden="true"
        className="aurora-halo aurora-drift"
        style={{ width: 640, height: 640, top: "10%", left: "50%", transform: "translateX(-50%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 grid-bg pointer-events-none"
        style={{
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 45%, #000 25%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 45%, #000 25%, transparent 75%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full relative z-10"
        style={{ maxWidth: step === 1 || step === 2 ? 720 : 480 }}
      >
        <div className="flex flex-col items-center mb-6">
          <Link href="/" className="mb-3">
            <VyneLogo variant="stacked" markSize={42} className="auth-logo text-white" />
          </Link>
          <h1
            className="text-white text-center"
            style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}
          >
            Create your VYNE workspace
          </h1>
          <p
            className="text-center mt-1.5"
            style={{ color: "rgba(255,255,255,0.55)", fontSize: 13.5 }}
          >
            {step === 0 && "Step 1 of 2 — your details"}
            {step === 1 && "Step 2 of 2 — pick what to enable"}
            {step === 2 && "Step 2 of 2 — pick your modules"}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 28 }}>
          {error && (
            <div
              role="alert"
              className="mb-4 px-4 py-3 rounded-lg text-sm"
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#F87171",
              }}
            >
              {error}
            </div>
          )}

          {step === 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (credentialsValid) setStep(1);
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                    Your name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Cooper"
                    autoComplete="name"
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="signup-company" className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                    Company name
                  </label>
                  <input
                    id="signup-company"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                    autoComplete="organization"
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Work email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 10 characters"
                    autoComplete="new-password"
                    required
                    style={{ ...inputStyle, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <ul className="mt-2.5 space-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(password);
                    return (
                      <li
                        key={rule.id}
                        className="flex items-center gap-2 text-xs"
                        style={{ color: ok ? "#86EFAC" : "rgba(255,255,255,0.5)" }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 999,
                            background: ok ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)",
                            border: `1px solid ${ok ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.15)"}`,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {ok && <Check size={9} color="#86EFAC" strokeWidth={3} />}
                        </span>
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <label htmlFor="signup-confirm" className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Confirm password
                </label>
                <input
                  id="signup-confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-type your password"
                  autoComplete="new-password"
                  required
                  style={inputStyle}
                />
                {confirm.length > 0 && !pwMatch && (
                  <p style={{ fontSize: 11.5, color: "#F87171", marginTop: 4 }}>
                    Passwords don&apos;t match.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!credentialsValid}
                className="btn-aurora w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ padding: "11px 18px", fontSize: 14, marginTop: 6 }}
              >
                Continue <ArrowRight size={15} />
              </button>
            </form>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                What do you want to use VYNE for? You can change this any time
                in Settings.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {PLANS.map((p) => {
                  const active = planId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlanId(p.id)}
                      style={{
                        textAlign: "left",
                        padding: 16,
                        borderRadius: 12,
                        border: `1.5px solid ${active ? "#22D3EE" : "rgba(255,255,255,0.1)"}`,
                        background: active
                          ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)"
                          : "rgba(255,255,255,0.03)",
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 0.15s",
                      }}
                    >
                      {p.recommended && (
                        <span
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#67E8F9",
                            background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.15)",
                            padding: "2px 7px",
                            borderRadius: 999,
                            letterSpacing: "0.04em",
                          }}
                        >
                          REC
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-1.5">
                        <Layers size={15} color={active ? "#22D3EE" : "rgba(255,255,255,0.5)"} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{p.name}</span>
                      </div>
                      <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, margin: 0 }}>
                        {p.tagline}
                      </p>
                      {p.modules.length > 0 && (
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
                          {p.modules.length} module{p.modules.length === 1 ? "" : "s"}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
                {planId === "custom" ? (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-aurora flex-1 flex items-center justify-center gap-2"
                    style={{ padding: "11px 18px", fontSize: 14 }}
                  >
                    Pick modules <ArrowRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCreate()}
                    disabled={submitting}
                    className="btn-aurora flex-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ padding: "11px 18px", fontSize: 14 }}
                  >
                    {submitting ? (
                      <><Loader2 size={15} className="animate-spin" /> Creating…</>
                    ) : (
                      <>Create workspace <Sparkles size={14} /></>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                Pick the modules to turn on. You can add more later.
              </p>
              <div
                className="grid gap-2.5 mt-3"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
              >
                {MODULES.map((m) => {
                  const active = customModules.has(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleCustom(m.id)}
                      style={{
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 10,
                        border: `1.5px solid ${active ? m.color : "rgba(255,255,255,0.1)"}`,
                        background: active ? `${m.color}14` : "rgba(255,255,255,0.03)",
                        cursor: "pointer",
                        position: "relative",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        transition: "all 0.15s",
                      }}
                    >
                      {active && (
                        <div
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 16,
                            height: 16,
                            borderRadius: 5,
                            background: m.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Check size={10} color="#fff" strokeWidth={3} />
                        </div>
                      )}
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: `${m.color}1F`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <m.icon size={15} color={m.color} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{m.name}</div>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "2px 0 0", lineHeight: 1.4 }}>
                          {m.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => handleCreate()}
                  disabled={submitting || customModules.size === 0}
                  className="btn-aurora flex-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ padding: "11px 18px", fontSize: 14 }}
                >
                  {submitting ? (
                    <><Loader2 size={15} className="animate-spin" /> Creating…</>
                  ) : (
                    <>Create workspace <Sparkles size={14} /></>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "rgba(255,255,255,0.5)" }}>
          Already have a workspace?{" "}
          <Link href="/login" className="font-medium" style={{ color: "#67E8F9" }}>
            Sign in
          </Link>
        </p>
        <p className="text-center text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
          Accounts are stored locally on this device while VYNE is in closed beta.
        </p>
      </motion.div>
    </div>
  );
}
