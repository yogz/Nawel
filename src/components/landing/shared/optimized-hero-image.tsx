"use client";

import Image from "next/image";
import blurPlaceholders from "@/data/blur-placeholders.json";

interface OptimizedHeroImageProps {
  baseName: string;
  alt: string;
  className?: string;
}

/**
 * Optimized hero image component that uses AVIF with WebP fallback
 * Uses picture element for format selection, Next.js Image for optimization
 * Includes blur placeholder for improved LCP
 */
export function OptimizedHeroImage({ baseName, alt, className }: OptimizedHeroImageProps) {
  // Generate base path without extension
  const basePath = baseName.replace(/\.(png|webp|jpg|jpeg)$/i, "");
  
  // Get blur placeholder if available
  const blurDataURL = blurPlaceholders[basePath as keyof typeof blurPlaceholders] as string | undefined;

  return (
    <picture style={{ position: "absolute", inset: 0, zIndex: -10 }}>
      {/* AVIF source with responsive sizes */}
      <source
        type="image/avif"
        srcSet={`
          /${basePath}-640w.avif 640w,
          /${basePath}-1024w.avif 1024w,
          /${basePath}-1920w.avif 1920w
        `}
        sizes="100vw"
      />
      {/* WebP fallback with responsive sizes */}
      <source
        type="image/webp"
        srcSet={`
          /${basePath}-640w.webp 640w,
          /${basePath}-1024w.webp 1024w,
          /${basePath}-1920w.webp 1920w
        `}
        sizes="100vw"
      />
      {/* Fallback to WebP default */}
      <Image
        src={`/${basePath}.webp`}
        alt={alt}
        fill
        sizes="100vw"
        className={className}
        priority
        fetchPriority="high"
        placeholder={blurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL}
      />
    </picture>
  );
}
