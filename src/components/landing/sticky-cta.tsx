"use client";

import { motion, useScroll } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";

import { sendGAEvent } from "@next/third-parties/google";

interface StickyCtaProps {
  text: string;
  variant: string;
}

export function StickyCta({ text, variant }: StickyCtaProps) {
  const { scrollY } = useScroll();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    return scrollY.on("change", (latest) => {
      // Show after scrolling down 400px
      setIsVisible(latest > 400);
    });
  }, [scrollY]);

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: isVisible ? 0 : 100 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/80 p-4 backdrop-blur-lg sm:hidden"
    >
      <Link
        href="/login?mode=user"
        onClick={() => sendGAEvent("event", "cta_click", { location: "sticky_mobile", variant })}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 py-3 text-base font-bold text-white shadow-lg transition-transform active:scale-95"
      >
        {text}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.div>
  );
}
