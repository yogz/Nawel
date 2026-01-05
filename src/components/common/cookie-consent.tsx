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
import { setAnalyticsConsent, getAnalyticsConsent } from "@/lib/analytics";
import { Cookie, Shield, ChartBar } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Cookie consent banner using Drawer for modern mobile-friendly design
 * Handles GDPR/RGPD compliance for analytics tracking
 */
export function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

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
    setHasInteracted(true);
    setIsOpen(false);
  };

  const handleReject = () => {
    setAnalyticsConsent(false);
    setHasInteracted(true);
    setIsOpen(false);
  };

  const handleCustomize = () => {
    // For now, same as reject - can be extended later
    handleReject();
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="space-y-3 pb-2 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
              <Cookie className="h-6 w-6 text-accent" />
            </div>
            <DrawerTitle className="text-xl">Respectons votre vie privée</DrawerTitle>
          </div>
          <DrawerDescription className="text-base leading-relaxed">
            Nous utilisons des cookies pour améliorer votre expérience et analyser l'utilisation de
            notre application.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-4 pb-6">
          {/* Features Grid */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background">
                <ChartBar className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Analyse d'utilisation</p>
                <p className="text-xs text-muted-foreground">
                  Nous aide à comprendre comment vous utilisez l'app pour l'améliorer
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background">
                <Shield className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Données sécurisées</p>
                <p className="text-xs text-muted-foreground">
                  Vos données sont anonymisées et jamais partagées avec des tiers
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleAccept}
              className="h-12 w-full text-base font-semibold"
              size="lg"
            >
              Tout accepter
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleReject} variant="outline" className="h-11">
                Tout refuser
              </Button>
              <Button onClick={handleCustomize} variant="ghost" className="h-11">
                Personnaliser
              </Button>
            </div>
          </div>

          {/* Legal Notice */}
          <p className="pt-2 text-center text-xs text-muted-foreground">
            En continuant, vous acceptez notre utilisation des cookies conformément à notre
            politique de confidentialité.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
