"use client";

import { useEffect } from "react";
import { isDatabaseError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCcw, Home } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");
  const isDbError = isDatabaseError(error);

  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-4 text-center">
      <div className="max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-amber-100 p-6 text-amber-600">
            <ShieldAlert size={48} />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">
            {isDbError ? t("dbTitle") : t("defaultTitle")}
          </h1>
          <p className="text-gray-500">
            {isDbError ? t("dbDescription") : t("defaultDescription")}
          </p>
        </div>

        {isDbError && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left text-sm text-gray-600">
            <p className="mb-1 font-bold">{t("suggestedActions")}</p>
            <ul className="list-inside list-disc space-y-1">
              <li>{t("actionInternet")}</li>
              <li>{t("actionDatabase")}</li>
              <li>{t("actionRetry")}</li>
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => reset()} className="flex items-center gap-2 px-8">
            <RefreshCcw size={18} />
            {t("retryButton")}
          </Button>
          <Link href="/">
            <Button variant="outline" className="flex w-full items-center gap-2 px-8">
              <Home size={18} />
              {t("homeButton")}
            </Button>
          </Link>
        </div>

        <p className="font-mono text-[10px] italic text-gray-400">
          {t("errorId")}: {error.digest || "N/A"}
        </p>
      </div>
    </div>
  );
}
