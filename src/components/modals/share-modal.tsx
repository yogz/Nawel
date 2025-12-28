"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function ShareModal({
  slug,
  adminKey,
  onClose,
  isNew,
}: {
  slug: string;
  adminKey?: string;
  onClose: () => void;
  isNew?: boolean;
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const t = useTranslations("EventDashboard.Sheets.Share");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${baseUrl}/event/${slug}${adminKey ? `?key=${adminKey}` : ""}`;

  const copyToClipboard = (text: string, type: "link" | "key") => {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-accent/10 text-3xl shadow-inner">
          ✨
        </div>
        <h3 className="text-xl font-black tracking-tight text-text">
          {isNew ? t("eventCreated") : t("title")}
        </h3>
        <p className="mt-2 text-sm text-gray-500">{t("description")}</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
            {t("adminLinkLabel")}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-white px-3 py-2 font-mono text-xs text-gray-600 ring-1 ring-black/[0.05]">
              {shareUrl}
            </code>
            <Button
              size="icon"
              variant="outline"
              className="shrink-0 rounded-xl"
              onClick={() => copyToClipboard(shareUrl, "link")}
            >
              {copiedLink ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </Button>
          </div>
        </div>

        {adminKey && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
              {t("accessKeyLabel")}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-white px-3 py-2 font-mono text-xs font-bold text-accent ring-1 ring-black/[0.05]">
                {adminKey}
              </code>
              <Button
                size="icon"
                variant="outline"
                className="shrink-0 rounded-xl"
                onClick={() => copyToClipboard(adminKey, "key")}
              >
                {copiedKey ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Button className="w-full" onClick={onClose}>
        {t("closeButton")}
      </Button>
    </div>
  );
}
