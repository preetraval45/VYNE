"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { MotionConfig } from "framer-motion";
import { ThemeApplier } from "@/components/layout/ThemeApplier";
import { TenantCssInjector } from "@/components/layout/TenantCssInjector";
import { Analytics } from "@/components/layout/Analytics";
import { installGlobalErrorHandlers } from "@/lib/errorReporter";
import { installFetchInterceptor } from "@/lib/fetchInterceptor";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    installGlobalErrorHandlers();
    installFetchInterceptor();
  }, []);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: false,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      <TenantCssInjector />
      <Analytics />
      {/* Honor OS-level prefers-reduced-motion for every Framer animation */}
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
      <Toaster
        position={
          // Toast sits above MobileBottomNav on phones, top-right on
          // desktop where the topbar already lives at top.
          typeof window !== "undefined" && window.matchMedia?.("(max-width: 768px)").matches
            ? "bottom-center"
            : "bottom-right"
        }
        containerStyle={{
          // Lift above MobileBottomNav (60px + safe-area) on mobile.
          bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
        }}
        toastOptions={{
          style: {
            background: "var(--content-bg)",
            color: "var(--text-primary)",
            border: "1px solid var(--content-border)",
            borderRadius: "8px",
            fontSize: "14px",
            fontFamily: "var(--font-geist-sans)",
            maxWidth: "92vw",
          },
          success: {
            iconTheme: {
              primary: "var(--status-success)" as string,
              secondary: "var(--content-bg)" as string,
            },
          },
          error: {
            iconTheme: {
              primary: "var(--status-danger)" as string,
              secondary: "var(--content-bg)" as string,
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}
