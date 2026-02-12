"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function VideoFromImagePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/video?tab=image");
  }, [router]);

  return null;
}
