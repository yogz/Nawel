"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { TOAST_DURATION } from "@/lib/constants";

export interface ToastMessage {
  text: string;
  type?: "success" | "error";
}

/**
 * Hook for managing toast messages with auto-dismiss functionality.
 * Handles cleanup of timeouts on unmount or when a new message is shown.
 */
export function useToast(duration: number = TOAST_DURATION) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showToast = useCallback(
    (toast: ToastMessage | null) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setMessage(toast);

      // Set new timeout if we have a message
      if (toast) {
        timeoutRef.current = setTimeout(() => {
          setMessage(null);
          timeoutRef.current = null;
        }, duration);
      }
    },
    [duration]
  );

  const clearToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMessage(null);
  }, []);

  return {
    message,
    showToast,
    clearToast,
    // For backwards compatibility with setSuccessMessage pattern
    setMessage: showToast,
  };
}
