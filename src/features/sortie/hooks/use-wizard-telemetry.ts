"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  trackWizardAbandoned,
  trackWizardGeminiCompleted,
  trackWizardGeminiStarted,
  trackWizardPasteSubmitted,
  trackWizardPublishFailed,
  trackWizardPublishStarted,
  trackWizardPublishSucceeded,
  trackWizardStepEntered,
  trackWizardStepExited,
  trackWizardSuggestionPicked,
} from "../lib/wizard-telemetry";

/**
 * Hook d'orchestration de la télémétrie wizard. Gère :
 * - les transitions de step (enter/exit avec durée),
 * - le timer paste→publish (la métrique nord),
 * - la détection d'abandon à l'unmount sans publish réussi.
 *
 * Toutes les durées sont en `Date.now()` ms ; pas de `performance.now()`
 * — pas besoin de précision sub-ms ici, et la valeur entière passe
 * mieux dans Umami pour aggregation.
 */
export function useWizardTelemetry(currentStep: string) {
  // Durée de la step active : timestamp d'entrée + step name (pour
  // détecter les transitions et fermer la step précédente). Init à 0
  // côté render (Date.now est impure côté React Compiler) — set par
  // le 1er useEffect qui simule l'entrée de la step initiale.
  const stepEnteredAtRef = useRef<number>(0);
  const previousStepRef = useRef<string | null>(null);
  // Pourquoi la step précédente s'est terminée. La valeur par défaut
  // est `advanced` (le cas le plus fréquent) ; back() et abandon()
  // l'écrasent juste avant la transition pour qu'on capture la bonne
  // raison dans `wizard_step_exited`.
  const lastExitOutcomeRef = useRef<"advanced" | "back" | "abandoned">("advanced");

  // Timer paste→publish. Set au 1er paste submit, lu au publish_succeeded.
  // Reste null si l'user publie sans passer par paste (théoriquement
  // impossible — paste est toujours la 1ʳᵉ step).
  const pasteAtRef = useRef<number | null>(null);

  // Timestamp de mount du wizard, pour calculer la durée totale
  // d'abandon. Init à 0 et set au 1er effect (Date.now impur).
  const mountedAtRef = useRef<number>(0);

  // Flag set sur publish_succeeded pour ne pas envoyer un wizard_abandoned
  // sur le cleanup d'unmount qui suit le redirect serveur.
  const publishedRef = useRef<boolean>(false);

  // Track step transitions. La 1ʳᵉ exécution émet uniquement step_entered
  // pour la step initiale (pas d'exit à fermer) et initialise les timers.
  useEffect(() => {
    const previous = previousStepRef.current;
    const now = Date.now();
    if (mountedAtRef.current === 0) {
      mountedAtRef.current = now;
    }
    if (previous && previous !== currentStep) {
      trackWizardStepExited(previous, now - stepEnteredAtRef.current, lastExitOutcomeRef.current);
    }
    if (previous !== currentStep) {
      trackWizardStepEntered(currentStep, previous);
      stepEnteredAtRef.current = now;
      previousStepRef.current = currentStep;
      // Reset à advanced pour la prochaine transition — back/abandon
      // doivent re-flagger explicitement.
    }
    lastExitOutcomeRef.current = "advanced";
  }, [currentStep]);

  // Cleanup : détecte les unmounts sans publish (le user a quitté la
  // page, fermé l'onglet, navigué ailleurs). Le redirect serveur après
  // publish_succeeded passe aussi par ici, d'où le `publishedRef` guard.
  useEffect(() => {
    return () => {
      if (publishedRef.current) {
        return;
      }
      const now = Date.now();
      // On émet une dernière step_exited pour la step active afin que le
      // funnel reste consistant, puis l'event abandon de plus haut niveau.
      const last = previousStepRef.current ?? "(unknown)";
      trackWizardStepExited(last, now - stepEnteredAtRef.current, "abandoned");
      trackWizardAbandoned(last, now - mountedAtRef.current);
    };
  }, []);

  const markBack = useCallback(() => {
    lastExitOutcomeRef.current = "back";
  }, []);

  const onPasteSubmitted = useCallback((kind: "url" | "text", hasVibe: boolean) => {
    if (pasteAtRef.current === null) {
      pasteAtRef.current = Date.now();
    }
    trackWizardPasteSubmitted(kind, hasVibe);
  }, []);

  const onSuggestionPicked = useCallback((source: "tm" | "oa" | "gemini") => {
    if (pasteAtRef.current === null) {
      pasteAtRef.current = Date.now();
    }
    trackWizardSuggestionPicked(source);
  }, []);

  // Gemini : on retourne une closure qui capture le timestamp de start
  // pour calculer la latence à la résolution. Évite de la stocker côté
  // appelant qui n'aurait qu'une raison de la garder.
  const onGeminiStarted = useCallback((trigger: "auto" | "optin" | "bg") => {
    trackWizardGeminiStarted(trigger);
    const startedAt = Date.now();
    return (outcome: "found" | "not_found" | "cancelled" | "error") => {
      trackWizardGeminiCompleted(outcome, Date.now() - startedAt);
    };
  }, []);

  const onPublishStarted = useCallback((mode: "fixed" | "vote", isLoggedIn: boolean) => {
    trackWizardPublishStarted(mode, isLoggedIn);
  }, []);

  const onPublishSucceeded = useCallback(
    (params: {
      mode: "fixed" | "vote";
      isLoggedIn: boolean;
      hasEmail: boolean;
      hasVenue: boolean;
      hasTicketUrl: boolean;
      hasHeroImage: boolean;
    }) => {
      publishedRef.current = true;
      const pasteToPublishMs = pasteAtRef.current !== null ? Date.now() - pasteAtRef.current : null;
      trackWizardPublishSucceeded({ ...params, pasteToPublishMs });
    },
    []
  );

  const onPublishFailed = useCallback((reason: "validation" | "server" | "network") => {
    trackWizardPublishFailed(reason);
  }, []);

  return {
    markBack,
    onPasteSubmitted,
    onSuggestionPicked,
    onGeminiStarted,
    onPublishStarted,
    onPublishSucceeded,
    onPublishFailed,
  };
}
