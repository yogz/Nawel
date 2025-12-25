"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import clsx from "clsx";

export function SuccessToast({
    message,
    christmas,
    type = "success"
}: {
    message: string | null;
    christmas?: boolean;
    type?: "success" | "error";
}) {
    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className="fixed top-24 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
                >
                    <div className={clsx(
                        "rounded-full px-5 py-2.5 shadow-xl backdrop-blur-sm border pointer-events-auto",
                        type === "error" ? "bg-red-500/95 border-red-400/20" : "bg-gray-900/95 border-white/10"
                    )}>
                        <div className="flex items-center gap-2.5 text-white">
                            {christmas ? (
                                <>
                                    <span className="text-base">{type === "error" ? "❌" : "🎄"}</span>
                                    <span className="font-semibold text-sm">{message}</span>
                                    <span className="text-base">{type === "error" ? "" : "✨"}</span>
                                </>
                            ) : (
                                <>
                                    <div className={clsx(
                                        "flex items-center justify-center w-5 h-5 rounded-full",
                                        type === "error" ? "bg-white text-red-500" : "bg-white text-black"
                                    )}>
                                        {type === "error" ? <X size={12} strokeWidth={4} /> : <Check size={12} strokeWidth={4} />}
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
