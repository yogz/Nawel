"use client";

import { useMemo } from "react";
import citationsData from "@/data/citations.json";

export function CitationDisplay() {
    const citation = useMemo(() => {
        const list = (citationsData as any).citations;
        const today = new Date().toDateString();
        let hash = 0;
        for (let i = 0; i < today.length; i++) {
            hash = today.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % list.length;
        return list[index];
    }, []);

    return (
        <div className="mt-1">
            <p className="text-[10px] italic font-medium text-accent/60 leading-tight">
                « {citation.phrase} »
            </p>
            <p className="text-[9px] font-bold text-accent/40 uppercase tracking-widest mt-0.5">
                — {citation.author}
            </p>
        </div>
    );
}
