"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Archive, EyeOff } from "lucide-react";

type Props = {
  children: ReactNode;
  onCommit: () => void;
  isPast?: boolean;
  /**
   * When true, disables the gesture entirely — used during the undo-toast
   * window of a *previous* archival, so a fast double-swipe can't stack
   * two archives before the first one resolves.
   */
  disabled?: boolean;
};

// Reveal geometry — tuned against Things 3 / Apple Mail. 88px gives a
// comfortable tap target behind the card plus enough room for icon + label.
// Commit at 50% reveal or on a fast-flick (velocity below -600px/s) — the
// velocity path is what makes the gesture feel snappy on a real phone.
const REVEAL_WIDTH = 88;
const COMMIT_THRESHOLD = REVEAL_WIDTH / 2;
const VELOCITY_COMMIT = 600;

/**
 * Swipe-left-to-archive wrapper. Sits around an outing card and reveals
 * a coral action pill as the user drags. Past the commit threshold (or
 * on a fast flick), it animates the card out and calls `onCommit`.
 *
 * Deliberately *not* a half-reveal pattern — either the swipe commits
 * or the card snaps back. Keeps the "what does tapping the revealed
 * card do?" ambiguity out of the design. The action button is visual
 * during the drag + clickable if the user keeps their finger on it.
 */
export function SwipeableArchivableCard({
  children,
  onCommit,
  isPast = false,
  disabled = false,
}: Props) {
  const x = useMotionValue(0);
  // Prevents double-commit if the fast-flick handler fires and the
  // button click lands in the same frame.
  const committingRef = useRef(false);

  // Action pill fades in as the reveal progresses — pure visual feedback
  // for the drag. Don't fade all the way to 1 until the commit point is
  // visible, so the user has a moment of "I could still let go" warning.
  const actionOpacity = useTransform(x, [-8, -REVEAL_WIDTH * 0.9], [0, 1]);
  const actionScale = useTransform(x, [-20, -REVEAL_WIDTH], [0.8, 1]);

  function commit() {
    if (committingRef.current) {
      return;
    }
    committingRef.current = true;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(14);
    }
    // Slide the whole card off-screen before telling the parent to hide
    // it — otherwise the list jumps to close the gap while the motion
    // div is still animating and you get a visible stutter.
    const ctrl = animate(x, -600, { duration: 0.22, ease: [0.4, 0, 1, 1] });
    ctrl.then(() => onCommit());
  }

  function snapBack() {
    animate(x, 0, { duration: 0.22, ease: [0.16, 1, 0.3, 1] });
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background action pill. `pointer-events-none` when the card is
          at rest so a stray mis-tap on the hidden button doesn't fire —
          becomes tappable only when the card has slid left enough to
          expose it. */}
      <motion.button
        type="button"
        aria-label={isPast ? "Retirer de mon profil" : "Archiver"}
        onClick={commit}
        style={{ opacity: actionOpacity }}
        className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center bg-hot-500 text-surface-50 active:bg-hot-600"
      >
        <motion.span style={{ scale: actionScale }} className="flex flex-col items-center gap-1">
          {isPast ? (
            <EyeOff size={20} strokeWidth={2.4} />
          ) : (
            <Archive size={20} strokeWidth={2.4} />
          )}
          <span className="text-[10px] font-black uppercase tracking-[0.12em]">
            {isPast ? "Retirer" : "Archiver"}
          </span>
        </motion.span>
      </motion.button>

      {/* Draggable foreground holding the real card. `touch-pan-y` lets
          vertical page scroll through while still capturing horizontal
          swipes — matches iOS list-in-scrollview behavior. */}
      <motion.div
        drag={disabled ? false : "x"}
        dragDirectionLock
        dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
        dragElastic={0.04}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={(_, info) => {
          const finalX = x.get();
          if (finalX <= -COMMIT_THRESHOLD || info.velocity.x < -VELOCITY_COMMIT) {
            commit();
          } else {
            snapBack();
          }
        }}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
