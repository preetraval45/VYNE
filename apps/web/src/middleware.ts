import { NextResponse, type NextRequest } from "next/server";

// ─── Auth guard ───────────────────────────────────────────────────
// The dashboard relied on a client-side Zustand check, so any visitor
// could hit /home directly and see the layout flash before the client
// redirect fired. Guard all authenticated routes server-side.
//
// We look for either:
//   - a real JWT cookie set by the backend (`vyne-token`)
//   - or the demo-mode client flag (`vyne-demo=1`) which the login page
//     writes when the user clicks "Try instant demo" — demo users have
//     a valid UX without a real account.
//
// Unauthenticated visitors are redirected to /login with `?next=` so
// they return to their intended destination after signing in.

const AUTH_PATHS = [
  "/home",
  "/dashboard",
  "/projects",
  "/chat",
  "/docs",
  "/ops",
  "/crm",
  "/hr",
  "/sales",
  "/finance",
  "/invoicing",
  "/purchase",
  "/manufacturing",
  "/maintenance",
  "/marketing",
  "/expenses",
  "/reporting",
  "/observe",
  "/ai",
  "/automations",
  "/code",
  "/roadmap",
  "/contacts",
  "/timesheet",
  "/training",
  "/playbooks",
  "/help",
  "/activity",
  "/settings",
  "/admin",
];

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!isAuthPath(pathname)) return NextResponse.next();

  const token = req.cookies.get("vyne-token")?.value;
  const demo = req.cookies.get("vyne-demo")?.value;
  if (token || demo) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Exclude _next internals, API routes, and static assets
    "/((?!_next/static|_next/image|api/|favicon.ico|brand/|images/|icons/).*)",
  ],
};
