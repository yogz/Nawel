"use client";

import { motion } from "framer-motion";

export function AuraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 h-full w-full bg-[#f3e8ff]" />
      <div className="absolute -inset-[20%] opacity-70">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 90, 0],
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ willChange: "transform, opacity" }}
          className="absolute inset-0 transform-gpu rounded-full bg-gradient-to-tr from-purple-400 via-violet-300 to-fuchsia-200 blur-[80px]"
        />
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            rotate: [0, -90, 0],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ willChange: "transform, opacity" }}
          className="absolute inset-0 transform-gpu rounded-full bg-gradient-to-bl from-indigo-300 via-purple-300 to-pink-200 blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ willChange: "transform, opacity" }}
          className="absolute inset-0 transform-gpu rounded-full bg-white/40 blur-[120px]"
        />
      </div>
    </div>
  );
}
