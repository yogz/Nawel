"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { setAnalyticsConsent } from "@/lib/analytics";
import { useLandingVariant } from "@/hooks/use-landing-variant";
import { sendGAEvent } from "@next/third-parties/google";
import { Cookie, Shield, ChartBar, ArrowLeft, Check } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Cookie consent banner using Drawer for modern mobile-friendly design
 * Handles GDPR/RGPD compliance for analytics tracking
 */
export function CookieConsent() {
  const t = useTranslations("CookieConsent");
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [view, setView] = useState<"main" | "customize">("main");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const variant = useLandingVariant();

  // Track variant only if/when consent is given
  useEffect(() => {
    const consent = localStorage.getItem("analytics_consent") === "true";
    if (consent && variant) {
      sendGAEvent("event", "landing_variant_assigned", { variant });
    }
  }, [variant]);

  useEffect(() => {
    // Check if user has already made a choice
    const consentStored = localStorage.getItem("analytics_consent");
    if (consentStored === null && !hasInteracted) {
      // Show consent drawer after a short delay for better UX
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasInteracted]);

  const handleAccept = () => {
    setAnalyticsConsent(true);
    if (variant) {
      sendGAEvent("event", "landing_variant_assigned", { variant });
    }
    setHasInteracted(true);
    setIsOpen(false);
  };

  const handleReject = () => {
    setAnalyticsConsent(false);
    setHasInteracted(true);
    setIsOpen(false);
  };

  const handleCustomize = () => {
    setView("customize");
  };

  const handleSaveCustom = () => {
    setAnalyticsConsent(analyticsEnabled);
    if (analyticsEnabled && variant) {
      sendGAEvent("event", "landing_variant_assigned", { variant });
    }
    setHasInteracted(true);
    setIsOpen(false);
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerContent className="max-h-[90vh] border-t-orange-100 bg-orange-50/95 backdrop-blur-xl">
        {view === "main" ? (
          <>
            <DrawerHeader className="space-y-3 pb-2 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100/50">
                  <Cookie className="h-6 w-6 text-orange-600" />
                </div>
                <DrawerTitle className="text-xl font-bold">{t("title")}</DrawerTitle>
              </div>
              <DrawerDescription className="text-base leading-relaxed text-gray-600">
                {t("description")}
              </DrawerDescription>
            </DrawerHeader>

            <div className="space-y-4 px-4 pb-6">
              {/* Features Grid */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 rounded-xl bg-white/40 p-3 ring-1 ring-orange-100/50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                    <ChartBar className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-gray-900">{t("usageTitle")}</p>
                    <p className="text-xs text-gray-500">{t("usageDescription")}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-white/40 p-3 ring-1 ring-orange-100/50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                    <Shield className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-gray-900">{t("securityTitle")}</p>
                    <p className="text-xs text-gray-500">{t("securityDescription")}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  onClick={handleAccept}
                  className="h-12 w-full bg-red-600 text-base font-bold text-white transition-all hover:bg-red-700 hover:shadow-lg"
                  size="lg"
                >
                  {t("acceptAll")}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleReject} variant="outline" className="h-11">
                    {t("rejectAll")}
                  </Button>
                  <Button onClick={handleCustomize} variant="ghost" className="h-11">
                    {t("customize")}
                  </Button>
                </div>
              </div>

              {/* Legal Notice */}
              <p className="pt-2 text-center text-xs text-muted-foreground">{t("legalNotice")}</p>
            </div>
          </>
        ) : (
          <>
            <DrawerHeader className="space-y-3 pb-2 text-left">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 h-10 w-10 rounded-full"
                  onClick={() => setView("main")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <DrawerTitle className="text-xl">{t("customize")}</DrawerTitle>
              </div>
            </DrawerHeader>

            <div className="space-y-6 px-4 pb-8">
              <div className="space-y-4">
                {/* Essential Cookies */}
                <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-4">
                  <div className="pt-1">
                    <Checkbox id="essential" checked disabled />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor="essential" className="text-base font-semibold">
                      {t("essentialTitle")}
                    </Label>
                    <p className="text-sm text-muted-foreground">{t("essentialDescription")}</p>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-4">
                  <div className="pt-1">
                    <Checkbox
                      id="analytics"
                      checked={analyticsEnabled}
                      onCheckedChange={(checked) => setAnalyticsEnabled(checked)}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor="analytics" className="text-base font-semibold">
                      {t("usageTitle")}
                    </Label>
                    <p className="text-sm text-muted-foreground">{t("usageDescription")}</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveCustom}
                className="h-12 w-full text-base font-semibold"
                size="lg"
              >
                {t("saveChoices")}
              </Button>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
