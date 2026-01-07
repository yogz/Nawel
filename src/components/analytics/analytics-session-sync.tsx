"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { setAnalyticsUserId } from "@/lib/analytics";

/**
 * Syncs the better-auth session user ID with Google Analytics
 * This allows for cross-device tracking while keeping data anonymous in GA
 */
export function AnalyticsSessionSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      setAnalyticsUserId(session.user.id);
    } else {
      setAnalyticsUserId(null);
    }
  }, [session?.user?.id]);

  return null;
}
