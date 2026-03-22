import React, { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Create a fresh QueryClient for tests ───────────────────────
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// ─── All Providers Wrapper ──────────────────────────────────────
interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient ?? createTestQueryClient();

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// ─── Custom render ──────────────────────────────────────────────
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

function customRender(ui: ReactElement, options: CustomRenderOptions = {}) {
  const { queryClient, ...renderOptions } = options;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <AllProviders queryClient={queryClient}>{children}</AllProviders>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// ─── Re-export everything ───────────────────────────────────────
export * from "@testing-library/react";
export { customRender as render };
export { default as userEvent } from "@testing-library/user-event";
