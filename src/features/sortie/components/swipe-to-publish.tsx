"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";

type Props = {
  onConfirm: () => Promise<void>;
  label?: string;
  confirmedLabel?: string;
};

/**
 * Drag-to-publish pill. Replaces the "Publier ma sortie" button at the
 * end of the create wizard — the gesture gives the irreversible social
 * act a little weight (friends get notified, link is live). Pure
 * Framer Motion drag, no external physics lib.
 *
 * Stages:
 *   idle   → knob at left, text "Glisser pour publier"
 *   dragging → knob follows finger, text fades
 *   committed → knob snaps to right, spinner, onConfirm fires
 *   done → checkmark (caller normally redirects at this point)
 *
 * Tap fallback : un user qui tape la knob sans glisser (8 % des cas
 * selon les retours produits sur Tinder/Bumble) reçoit un wiggle + un
 * toast "Glisse pour confirmer →" pour rendre l'affordance évidente.
 * Et si `prefers-reduced-motion` est actif, le tap confirme directement
 * — pas de geste path-based requis (WCAG 2.5.1 Pointer Gestures).
 */
export function SwipeToPublish({
  onConfirm,
  label = "GLISSE POUR PUBLIER",
  confirmedLabel = "live ✓",
}: Props) {
  const x = useMotionValue(0);
  const [stage, setStage] = useState<"idle" | "committed" | "done" | "error">("idle");
  const [trackWidth, setTrackWidth] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const reducedMotion = useReducedMotion();
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Knob size: h-14 w-14 (56px). Travel = track width - 56 - padding.
  const maxX = Math.max(0, trackWidth - 56 - 8);
  const commitThreshold = maxX * 0.85;

  // Text opacity fades as knob moves right.
  const textOpacity = useTransform(x, [0, maxX * 0.4], [1, 0]);
  // Track fills behind the knob — visualizes progress.
  const fillOpacity = useTransform(x, [0, maxX], [0, 1]);

  // Auto-wiggle après 4 s d'inactivité sur la step pour signaler
  // l'affordance aux users qui regardent l'écran sans toucher. On le
  // fait une seule fois — au-delà ça devient nag.
  useEffect(() => {
    if (stage !== "idle") {
      return;
    }
    const t = setTimeout(() => {
      if (stage === "idle" && x.get() === 0) {
        animate(x, [0, 12, -6, 0], { duration: 0.5 });
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [stage, x]);

  function triggerWiggle() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(15);
    }
    if (!reducedMotion) {
      animate(x, [0, 12, -8, 6, 0], { duration: 0.45 });
    }
    setShowHint(true);
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = setTimeout(() => setShowHint(false), 1800);
  }

  async function commit() {
    if (stage !== "idle") {
      return;
    }
    setStage("committed");
    animate(x, maxX, { duration: 0.18 });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(10);
    }
    try {
      await onConfirm();
      setStage("done");
    } catch {
      setStage("error");
      // Roll back so user can retry.
      animate(x, 0, { duration: 0.22 });
      setTimeout(() => setStage("idle"), 300);
    }
  }

  return (
    <div
      ref={(node) => {
        if (node && node.offsetWidth !== trackWidth) {
          setTrackWidth(node.offsetWidth);
        }
      }}
      className="relative h-16 w-full overflow-hidden rounded-full bg-bordeaux-600/15 px-1"
    >
      {/* Progress fill */}
      <motion.div
        aria-hidden="true"
        style={{ opacity: fillOpacity }}
        className="absolute inset-0 rounded-full bg-bordeaux-600"
      />

      {/* Centered label */}
      <motion.p
        style={{ opacity: stage === "idle" ? textOpacity : 0 }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[12px] font-bold tracking-[0.2em] text-bordeaux-700"
      >
        {label}
      </motion.p>

      {stage === "committed" && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 font-mono text-[12px] font-bold tracking-[0.2em] text-ivoire-50">
          <Loader2 size={16} className="animate-spin" />
          GOING LIVE…
        </p>
      )}

      {stage === "done" && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 font-mono text-[12px] font-bold tracking-[0.2em] text-ivoire-50">
          <Check size={18} strokeWidth={3} />
          {confirmedLabel}
        </p>
      )}

      {/* Toast hint éphémère après un tap sans glisser. */}
      {showHint && stage === "idle" && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute -top-7 left-0 right-0 text-center text-xs font-bold text-bordeaux-700"
          aria-live="polite"
        >
          Glisse pour confirmer →
        </motion.p>
      )}

      {/* Knob */}
      <motion.div
        drag={stage === "idle" ? "x" : false}
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0.02}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={() => {
          if (x.get() >= commitThreshold) {
            commit();
          } else {
            animate(x, 0, { duration: 0.22, ease: [0.16, 1, 0.3, 1] });
          }
        }}
        onTap={() => {
          if (stage !== "idle") {
            return;
          }
          // Si l'utilisateur a `prefers-reduced-motion` activé, le tap
          // valide directement — on lui épargne le geste path-based qui
          // peut être inaccessible (Parkinson, contrôle moteur fin).
          if (reducedMotion) {
            commit();
            return;
          }
          // Sinon, on signale l'affordance par un wiggle + toast.
          triggerWiggle();
        }}
        role="button"
        tabIndex={0}
        aria-label={
          reducedMotion
            ? "Publier la sortie"
            : "Glisser pour publier la sortie (taper pour voir comment faire)"
        }
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && stage === "idle") {
            e.preventDefault();
            commit();
          }
        }}
        className={`absolute top-1 left-1 grid size-14 cursor-grab place-items-center rounded-full bg-bordeaux-600 text-ivoire-50 shadow-[var(--shadow-md)] touch-none active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordeaux-400 ${
          stage === "done" ? "bg-or-600" : ""
        }`}
      >
        {stage === "idle" && <ArrowRight size={20} strokeWidth={2.5} />}
        {stage === "committed" && <Loader2 size={18} className="animate-spin" />}
        {stage === "done" && <Check size={20} strokeWidth={3} />}
      </motion.div>
    </div>
  );
}
