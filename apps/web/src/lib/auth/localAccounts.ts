// Browser-side password helpers used by the signup form for client-side
// rule feedback. The actual account is created server-side via
// /api/auth/signup against Vercel Postgres — see apps/web/src/app/api/auth/.

export interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "len", label: "At least 10 characters", test: (p) => p.length >= 10 },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "num", label: "One number", test: (p) => /[0-9]/.test(p) },
  {
    id: "special",
    label: "One special character (!@#$%^&* etc.)",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export function validatePassword(password: string): {
  valid: boolean;
  failed: PasswordRule[];
} {
  const failed = PASSWORD_RULES.filter((r) => !r.test(password));
  return { valid: failed.length === 0, failed };
}
