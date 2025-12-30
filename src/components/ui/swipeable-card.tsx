"use client";

import { useState } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
  className?: string;
}

const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 80;

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = "Delete",
  rightLabel = "Edit",
  disabled = false,
  className = "",
}: SwipeableCardProps) {
  const controls = useAnimation();
  const [activeAction, setActiveAction] = useState<"left" | "right" | null>(null);

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Determine if swipe is significant enough
    const shouldTriggerLeft = offset < -SWIPE_THRESHOLD || velocity < -500;
    const shouldTriggerRight = offset > SWIPE_THRESHOLD || velocity > 500;

    if (shouldTriggerLeft && onSwipeLeft) {
      // Animate to reveal left action, then execute
      await controls.start({
        x: -ACTION_WIDTH,
        transition: { type: "spring", damping: 25, stiffness: 300 },
      });
      onSwipeLeft();
      // Snap back after action
      setTimeout(() => {
        controls.start({ x: 0, transition: { type: "spring", damping: 25, stiffness: 300 } });
        setActiveAction(null);
      }, 150);
    } else if (shouldTriggerRight && onSwipeRight) {
      // Animate to reveal right action, then execute
      await controls.start({
        x: ACTION_WIDTH,
        transition: { type: "spring", damping: 25, stiffness: 300 },
      });
      onSwipeRight();
      // Snap back after action
      setTimeout(() => {
        controls.start({ x: 0, transition: { type: "spring", damping: 25, stiffness: 300 } });
        setActiveAction(null);
      }, 150);
    } else {
      // Snap back to center
      controls.start({ x: 0, transition: { type: "spring", damping: 25, stiffness: 300 } });
      setActiveAction(null);
    }
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -20) {
      setActiveAction("left");
    } else if (info.offset.x > 20) {
      setActiveAction("right");
    } else {
      setActiveAction(null);
    }
  };

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Left action (Delete) - shown when swiping left */}
      {onSwipeLeft && (
        <div
          className={`absolute inset-y-0 right-0 flex w-20 items-center justify-center transition-all duration-200 ${
            activeAction === "left"
              ? "bg-gradient-to-l from-red-500 to-red-600 text-white"
              : "bg-red-100 text-red-500"
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <Trash2 size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{leftLabel}</span>
          </div>
        </div>
      )}

      {/* Right action (Edit) - shown when swiping right */}
      {onSwipeRight && (
        <div
          className={`absolute inset-y-0 left-0 flex w-20 items-center justify-center transition-all duration-200 ${
            activeAction === "right"
              ? "bg-gradient-to-r from-accent to-accent/80 text-white"
              : "bg-accent/10 text-accent"
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <Pencil size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{rightLabel}</span>
          </div>
        </div>
      )}

      {/* Main content - draggable */}
      <motion.div
        drag="x"
        dragConstraints={{
          left: onSwipeLeft ? -ACTION_WIDTH : 0,
          right: onSwipeRight ? ACTION_WIDTH : 0,
        }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        className={`relative z-10 cursor-grab active:cursor-grabbing ${className}`}
        style={{ touchAction: "pan-y" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
