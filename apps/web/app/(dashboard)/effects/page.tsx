"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EffectsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/style-transfer");
  }, [router]);

  return null;
}
