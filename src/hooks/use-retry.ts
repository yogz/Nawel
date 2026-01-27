"use client";

import { useState, useCallback } from "react";

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Hook for retrying failed operations with exponential backoff
 * Useful for network requests that may fail temporarily
 */
export function useRetry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions = {}
): {
  execute: (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
  isRetrying: boolean;
  retryCount: number;
} {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
      let currentRetry = 0;
      let delay = initialDelay;

      while (currentRetry <= maxRetries) {
        try {
          setIsRetrying(currentRetry > 0);
          setRetryCount(currentRetry);
          const result = await fn(...args);
          setIsRetrying(false);
          setRetryCount(0);
          return result as Awaited<ReturnType<T>>;
        } catch (error) {
          if (currentRetry >= maxRetries) {
            setIsRetrying(false);
            setRetryCount(0);
            throw error;
          }

          // Wait before retrying with exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * backoffMultiplier, maxDelay);
          currentRetry++;
        }
      }

      throw new Error("Max retries exceeded");
    },
    [fn, maxRetries, initialDelay, maxDelay, backoffMultiplier]
  );

  return { execute, isRetrying, retryCount };
}
