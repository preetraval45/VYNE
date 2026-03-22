"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ThemeApplier } from "@/components/layout/ThemeApplier";

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
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1C1C2E",
            color: "#FFFFFF",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            fontSize: "14px",
            fontFamily: "var(--font-geist-sans)",
          },
          success: {
            iconTheme: {
              primary: "#22C55E",
              secondary: "#1C1C2E",
            },
          },
          error: {
            iconTheme: {
              primary: "#EF4444",
              secondary: "#1C1C2E",
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}
