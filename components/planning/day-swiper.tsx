"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSwipeable } from "react-swipeable";
import { Day } from "@/lib/types";

export function DaySwiper({
  days,
  index,
  onChange,
  children,
}: {
  days: Day[];
  index: number;
  onChange: (idx: number) => void;
  children: (day: Day) => React.ReactNode;
}) {
  const handlers = useSwipeable({
    onSwipedLeft: () => onChange(Math.min(days.length - 1, index + 1)),
    onSwipedRight: () => onChange(Math.max(0, index - 1)),
    trackMouse: true,
  });

  return (
    <div className="relative" {...handlers}>
      <div className="mb-3 flex items-center justify-between px-4">
        <button
          className="rounded-full p-2 text-gray-500 disabled:opacity-30"
          onClick={() => onChange(Math.max(0, index - 1))}
          disabled={index === 0}
          aria-label="Previous day"
        >
          <ChevronLeft />
        </button>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-gray-500">{days[index]?.date}</p>
          <p className="text-lg font-semibold">{days[index]?.title ?? ""}</p>
        </div>
        <button
          className="rounded-full p-2 text-gray-500 disabled:opacity-30"
          onClick={() => onChange(Math.min(days.length - 1, index + 1))}
          disabled={index === days.length - 1}
          aria-label="Next day"
        >
          <ChevronRight />
        </button>
      </div>
      <div className="overflow-hidden">
        <AnimatePresence initial={false} custom={index}>
          <motion.div
            key={index}
            custom={index}
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            {days[index] && children(days[index])}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
