"use client";

import { motion } from "framer-motion";

export function AuraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 h-full w-full bg-surface" />
      <div className="absolute -inset-[20%] opacity-60">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ willChange: "transform, opacity" }}
          className="absolute inset-0 transform-gpu rounded-full bg-gradient-to-tr from-purple-600 via-accent to-red-500 blur-[60px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ willChange: "transform, opacity" }}
          className="absolute inset-0 transform-gpu rounded-full bg-gradient-to-bl from-accent via-purple-500 to-blue-400 blur-[80px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ willChange: "transform, opacity" }}
          className="absolute inset-0 transform-gpu rounded-full bg-purple-500/40 blur-[100px]"
        />
      </div>
    </div>
  );
}
