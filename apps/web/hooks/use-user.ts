"use client";

import useSWR from "swr";

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export function useUser() {
  const { data, error, isLoading, mutate } = useSWR<{ user: User }>("/api/auth/me");

  return {
    user: data?.user ?? null,
    isLoading,
    error,
    mutate,
  };
}
