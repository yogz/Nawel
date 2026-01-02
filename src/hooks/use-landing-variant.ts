"use client";

import { useEffect, useState } from "react";

type LandingVariant = "landing" | "landing-alt";

export function useLandingVariant() {
  const [variant, setVariant] = useState<LandingVariant>("landing");

  return variant;
}
