/**
 * Formula evaluator for calculated fields (22.7).
 *
 *   evaluateFormula("=value * probability / 100", deal)
 *     → number
 *
 * Supported syntax (small, deliberately):
 *   - Numeric literals: 42, 1.5, .5, 1e3
 *   - Field refs: [value], [stage], or bare names if alphanumeric
 *   - Operators: + - * / % ^ ( )
 *   - Functions: SUM, AVG, MIN, MAX, IF, ROUND, ABS, COUNT
 *   - String literals inside IF: 'won', "lost"
 *   - Boolean ops: ==, !=, <, <=, >, >=, AND, OR, NOT
 *
 * No `eval` — a tiny shunting-yard parser turns the string into RPN
 * and a stack interpreter computes the result. Safe to run on
 * untrusted formulas (no host-object access).
 */

type Token =
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "ref"; name: string }
  | { kind: "op"; value: string }
  | { kind: "fn"; name: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" };

const FUNCTIONS = new Set([
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "IF",
  "ROUND",
  "ABS",
  "COUNT",
  "AND",
  "OR",
  "NOT",
]);

const PRECEDENCE: Record<string, number> = {
  "||": 1,
  "&&": 2,
  "==": 3,
  "!=": 3,
  "<": 4,
  "<=": 4,
  ">": 4,
  ">=": 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6,
  "%": 6,
  "^": 7,
};

const RIGHT_ASSOC = new Set(["^"]);

function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const trimmed = input.trim().replace(/^=/, "");
  while (i < trimmed.length) {
    const c = trimmed[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/\d/.test(c) || (c === "." && /\d/.test(trimmed[i + 1] ?? ""))) {
      let j = i;
      while (j < trimmed.length && /[0-9.eE+-]/.test(trimmed[j])) {
        // Don't gobble a +/- that follows e/E unless preceded by [eE].
        if (
          (trimmed[j] === "+" || trimmed[j] === "-") &&
          !/[eE]/.test(trimmed[j - 1])
        ) {
          break;
        }
        j++;
      }
      out.push({ kind: "num", value: Number(trimmed.slice(i, j)) });
      i = j;
      continue;
    }
    if (c === "[") {
      const close = trimmed.indexOf("]", i + 1);
      if (close < 0) throw new Error("Unclosed [");
      out.push({ kind: "ref", name: trimmed.slice(i + 1, close) });
      i = close + 1;
      continue;
    }
    if (c === "'" || c === '"') {
      const close = trimmed.indexOf(c, i + 1);
      if (close < 0) throw new Error(`Unclosed ${c}`);
      out.push({ kind: "str", value: trimmed.slice(i + 1, close) });
      i = close + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < trimmed.length && /[A-Za-z0-9_]/.test(trimmed[j])) j++;
      const word = trimmed.slice(i, j);
      const upper = word.toUpperCase();
      if (FUNCTIONS.has(upper)) {
        out.push({ kind: "fn", name: upper });
      } else if (upper === "AND") {
        out.push({ kind: "op", value: "&&" });
      } else if (upper === "OR") {
        out.push({ kind: "op", value: "||" });
      } else if (upper === "NOT") {
        out.push({ kind: "fn", name: "NOT" });
      } else if (upper === "TRUE") {
        out.push({ kind: "num", value: 1 });
      } else if (upper === "FALSE") {
        out.push({ kind: "num", value: 0 });
      } else {
        out.push({ kind: "ref", name: word });
      }
      i = j;
      continue;
    }
    if (c === "(") {
      out.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      out.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (c === ",") {
      out.push({ kind: "comma" });
      i++;
      continue;
    }
    // Multi-char ops.
    const two = trimmed.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", "&&", "||"].includes(two)) {
      out.push({ kind: "op", value: two });
      i += 2;
      continue;
    }
    if ("+-*/%^<>".includes(c)) {
      out.push({ kind: "op", value: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected character: ${c}`);
  }
  return out;
}

function shuntingYard(tokens: Token[]): Token[] {
  const out: Token[] = [];
  const stack: Token[] = [];
  const argCounts: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === "num" || t.kind === "ref" || t.kind === "str") {
      out.push(t);
      continue;
    }
    if (t.kind === "fn") {
      stack.push(t);
      argCounts.push(1);
      continue;
    }
    if (t.kind === "comma") {
      while (stack.length && stack[stack.length - 1].kind !== "lparen") {
        out.push(stack.pop()!);
      }
      argCounts[argCounts.length - 1] = (argCounts[argCounts.length - 1] ?? 0) + 1;
      continue;
    }
    if (t.kind === "op") {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.kind === "op") {
          const tp = PRECEDENCE[t.value] ?? 0;
          const sp = PRECEDENCE[top.value] ?? 0;
          if (
            sp > tp ||
            (sp === tp && !RIGHT_ASSOC.has(t.value))
          ) {
            out.push(stack.pop()!);
            continue;
          }
        }
        break;
      }
      stack.push(t);
      continue;
    }
    if (t.kind === "lparen") {
      stack.push(t);
      continue;
    }
    if (t.kind === "rparen") {
      while (stack.length && stack[stack.length - 1].kind !== "lparen") {
        out.push(stack.pop()!);
      }
      if (!stack.length) throw new Error("Mismatched )");
      stack.pop();
      if (stack.length && stack[stack.length - 1].kind === "fn") {
        const fn = stack.pop() as Extract<Token, { kind: "fn" }>;
        const argc = argCounts.pop() ?? 1;
        out.push({ kind: "fn", name: `${fn.name}#${argc}` });
      }
      continue;
    }
  }
  while (stack.length) {
    const t = stack.pop()!;
    if (t.kind === "lparen" || t.kind === "rparen") {
      throw new Error("Mismatched parens");
    }
    out.push(t);
  }
  return out;
}

function applyOp(op: string, a: number, b: number): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? 0 : a / b;
    case "%":
      return b === 0 ? 0 : a % b;
    case "^":
      return Math.pow(a, b);
    case "==":
      return a === b ? 1 : 0;
    case "!=":
      return a !== b ? 1 : 0;
    case "<":
      return a < b ? 1 : 0;
    case "<=":
      return a <= b ? 1 : 0;
    case ">":
      return a > b ? 1 : 0;
    case ">=":
      return a >= b ? 1 : 0;
    case "&&":
      return a && b ? 1 : 0;
    case "||":
      return a || b ? 1 : 0;
    default:
      throw new Error(`Unknown op: ${op}`);
  }
}

function applyFn(name: string, args: number[]): number {
  switch (name) {
    case "SUM":
      return args.reduce((s, x) => s + x, 0);
    case "AVG":
      return args.length ? args.reduce((s, x) => s + x, 0) / args.length : 0;
    case "MIN":
      return Math.min(...args);
    case "MAX":
      return Math.max(...args);
    case "IF":
      return args[0] ? args[1] ?? 0 : args[2] ?? 0;
    case "ROUND":
      return args.length === 1
        ? Math.round(args[0])
        : Math.round(args[0] * Math.pow(10, args[1])) / Math.pow(10, args[1]);
    case "ABS":
      return Math.abs(args[0]);
    case "COUNT":
      return args.length;
    case "NOT":
      return args[0] ? 0 : 1;
    default:
      throw new Error(`Unknown fn: ${name}`);
  }
}

function refValue(scope: Record<string, unknown>, name: string): number {
  const v = scope[name];
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  return 0;
}

/**
 * Evaluate a formula against a record. Returns 0 on parse error so a
 * broken formula in a single row doesn't crash the table.
 */
export function evaluateFormula(
  formula: string,
  scope: Record<string, unknown>,
): number {
  try {
    const rpn = shuntingYard(tokenize(formula));
    const stack: Array<number | string> = [];
    for (const t of rpn) {
      if (t.kind === "num") stack.push(t.value);
      else if (t.kind === "str") stack.push(t.value);
      else if (t.kind === "ref") stack.push(refValue(scope, t.name));
      else if (t.kind === "op") {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(applyOp(t.value, Number(a), Number(b)));
      } else if (t.kind === "fn") {
        const [name, argcStr] = t.name.split("#");
        const argc = Number(argcStr ?? "1");
        const args: number[] = [];
        for (let i = 0; i < argc; i++) args.unshift(Number(stack.pop()));
        stack.push(applyFn(name, args));
      }
    }
    const top = stack.pop();
    return Number(top ?? 0);
  } catch {
    return 0;
  }
}

/** Validate a formula without throwing — returns null when valid,
 *  otherwise the parse error message. */
export function validateFormula(formula: string): string | null {
  try {
    shuntingYard(tokenize(formula));
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "invalid formula";
  }
}
