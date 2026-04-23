"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { MotionConfig } from "framer-motion";
import { ThemeApplier } from "@/components/layout/ThemeApplier";
import { TenantCssInjector } from "@/components/layout/TenantCssInjector";

export function Providers({ children }: { children: React.ReactNode }) {
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
      {/* Honor OS-level prefers-reduced-motion for every Framer animation */}
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--content-bg)",
            color: "var(--text-primary)",
            border: "1px solid var(--content-border)",
            borderRadius: "8px",
            fontSize: "14px",
            fontFamily: "var(--font-geist-sans)",
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
