"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  confirmLeft?: boolean;
  confirmLeftTitle?: string;
  confirmLeftMessage?: string;
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
  confirmLeft = false,
  confirmLeftTitle = "Confirm",
  confirmLeftMessage = "Are you sure?",
  disabled = false,
  className = "",
}: SwipeableCardProps) {
  const controls = useAnimation();
  const [activeAction, setActiveAction] = useState<"left" | "right" | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Measure actual card height
  useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setCardHeight(entry.contentRect.height);
        }
      });
      resizeObserver.observe(contentRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const resetSwipe = () => {
    controls.start({ x: 0, transition: { type: "spring", damping: 25, stiffness: 300 } });
    setActiveAction(null);
  };

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    const shouldTriggerLeft = offset < -SWIPE_THRESHOLD || velocity < -500;
    const shouldTriggerRight = offset > SWIPE_THRESHOLD || velocity > 500;

    if (shouldTriggerLeft && onSwipeLeft) {
      await controls.start({
        x: -ACTION_WIDTH,
        transition: { type: "spring", damping: 25, stiffness: 300 },
      });

      if (confirmLeft) {
        setShowConfirmDialog(true);
      } else {
        onSwipeLeft();
        setTimeout(resetSwipe, 150);
      }
    } else if (shouldTriggerRight && onSwipeRight) {
      await controls.start({
        x: ACTION_WIDTH,
        transition: { type: "spring", damping: 25, stiffness: 300 },
      });
      onSwipeRight();
      setTimeout(resetSwipe, 150);
    } else {
      resetSwipe();
    }
  };

  const handleConfirmDelete = () => {
    onSwipeLeft?.();
    setShowConfirmDialog(false);
    resetSwipe();
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
    resetSwipe();
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

  const actionStyle = cardHeight ? { height: cardHeight } : {};

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl">
        {/* Left action (Delete) - shown when swiping left */}
        {onSwipeLeft && (
          <div
            style={actionStyle}
            className={`absolute inset-y-0 right-0 flex w-20 items-center justify-center transition-all duration-200 ${
              activeAction === "left"
                ? "bg-gradient-to-l from-red-500 to-red-600 text-white"
                : "bg-red-100 text-red-500"
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <Trash2 size={20} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{leftLabel}</span>
            </div>
          </div>
        )}

        {/* Right action (Edit) - shown when swiping right */}
        {onSwipeRight && (
          <div
            style={actionStyle}
            className={`absolute inset-y-0 left-0 flex w-20 items-center justify-center transition-all duration-200 ${
              activeAction === "right"
                ? "bg-gradient-to-r from-accent to-accent/80 text-white"
                : "bg-accent/10 text-accent"
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <Pencil size={20} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{rightLabel}</span>
            </div>
          </div>
        )}

        {/* Main content - draggable */}
        <motion.div
          ref={contentRef}
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

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-[320px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{confirmLeftTitle}</DialogTitle>
            <DialogDescription>{confirmLeftMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={handleCancelDelete} className="flex-1">
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
