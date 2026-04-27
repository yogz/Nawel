"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the on-screen keyboard height and the visible viewport height
 * via `window.visualViewport`. Used to lift bottom sheets above the
 * keyboard on mobile so inputs near the bottom (email, submit) stay
 * reachable.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
      setInset(Math.max(0, Math.round(keyboardHeight)));
      setViewportHeight(Math.round(vv.height));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return { inset, viewportHeight };
}
