"use client";

import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { useTranslations } from "next-intl";

interface RetryButtonProps {
  onRetry: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Button component for retrying failed operations
 * Provides visual feedback and accessibility
 */
export function RetryButton({ onRetry, isLoading = false, className }: RetryButtonProps) {
  const t = useTranslations("Error");

  return (
    <Button
      onClick={onRetry}
      disabled={isLoading}
      variant="outline"
      className={className}
      aria-label={t("retryButton")}
    >
      <RefreshCcw size={18} className={isLoading ? "animate-spin" : ""} />
      {t("retryButton")}
    </Button>
  );
}
