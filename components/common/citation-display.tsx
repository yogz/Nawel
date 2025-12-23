"use client";

import { useMemo, useState } from "react";
import citationsData from "@/data/citations.json";
import { motion, AnimatePresence } from "framer-motion";

export function CitationDisplay() {
    const [showAuthor, setShowAuthor] = useState(false);
    const citation = useMemo(() => {
        const list = (citationsData as any).citations;
        // Use a stable seed for the day to avoid hydration issues and change daily
        const today = new Date();
        const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        let hash = 0;
        for (let i = 0; i < dateString.length; i++) {
            hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % list.length;
        return list[index];
    }, []);

    return (
        <div
            className="mt-1 cursor-pointer select-none"
            onClick={() => setShowAuthor(!showAuthor)}
        >
            <AnimatePresence mode="wait">
                {!showAuthor ? (
                    <motion.p
                        key="phrase"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-[10px] italic font-medium text-accent/60 leading-tight"
                    >
                        « {citation.phrase} »
                    </motion.p>
                ) : (
                    <motion.p
                        key="author"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-[9px] font-bold text-accent/40 uppercase tracking-widest"
                    >
                        — {citation.author}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
