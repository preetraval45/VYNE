import "@testing-library/jest-dom";
import { vi } from "vitest";

// ─── Mock next/navigation ───────────────────────────────────────
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();
const mockForward = vi.fn();
const mockRefresh = vi.fn();
const mockPrefetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    forward: mockForward,
    refresh: mockRefresh,
    prefetch: mockPrefetch,
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// ─── Mock next/image ────────────────────────────────────────────
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    const { fill, priority, ...rest } = props;
    return <img {...rest} />;
  },
}));

// ─── Mock next/link ─────────────────────────────────────────────
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// ─── Mock framer-motion ─────────────────────────────────────────
vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        return ({
          children,
          ...rest
        }: {
          children?: React.ReactNode;
          [key: string]: unknown;
        }) => {
          // Strip framer-motion-specific props
          const {
            initial,
            animate,
            exit,
            transition,
            variants,
            whileHover,
            whileTap,
            whileFocus,
            whileInView,
            layout,
            layoutId,
            ...domProps
          } = rest;
          const Component = prop as keyof JSX.IntrinsicElements;
          return <Component {...domProps}>{children}</Component>;
        };
      },
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
  useMotionValue: (val: number) => ({ get: () => val, set: vi.fn() }),
  useTransform: (val: unknown) => val,
}));

// ─── Mock window.matchMedia ─────────────────────────────────────
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ─── Mock IntersectionObserver ───────────────────────────────────
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// ─── Mock ResizeObserver ────────────────────────────────────────
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: MockResizeObserver,
});

// ─── Suppress console.error for expected test errors ────────────
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress React error boundary console.error calls in tests
    const firstArg = typeof args[0] === "string" ? args[0] : "";
    if (
      firstArg.includes("[VYNE ErrorBoundary]") ||
      firstArg.includes("Error: Uncaught") ||
      firstArg.includes("The above error occurred")
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});
