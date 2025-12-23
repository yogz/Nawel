"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

export function SuccessToast({ message, christmas }: { message: string | null; christmas?: boolean }) {
    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className="fixed top-24 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
                >
                    <div className="rounded-full px-5 py-2.5 shadow-xl bg-gray-900/95 backdrop-blur-sm border border-white/10 pointer-events-auto">
                        <div className="flex items-center gap-2.5 text-white">
                            {christmas ? (
                                <>
                                    <span className="text-base">🎄</span>
                                    <span className="font-semibold text-sm">{message}</span>
                                    <span className="text-base">✨</span>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500">
                                        <Check size={12} strokeWidth={3} className="text-white" />
                                    </div>
                                    <span className="font-semibold text-sm">{message}</span>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
