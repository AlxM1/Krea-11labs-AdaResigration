"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

// Global fetcher function
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          fetcher,
          revalidateOnFocus: false,
          revalidateOnReconnect: true,
          shouldRetryOnError: true,
          errorRetryCount: 3,
          errorRetryInterval: 5000,
          dedupingInterval: 2000,
        }}
      >
        {children}
      </SWRConfig>
    </SessionProvider>
  );
}
