"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useCallback } from "react";
import { trackFeatureView } from "@/lib/analytics";
import { useTrackView } from "@/hooks/use-track-view";

interface FeatureCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  tag?: string;
  index: number;
  variant: string;
  /** Visual style variant */
  styleVariant?: "default" | "alt";
}

export function FeatureCard({
  id,
  title,
  description,
  icon,
  image,
  tag,
  index,
  variant,
  styleVariant = "default",
}: FeatureCardProps) {
  const ref = useTrackView<HTMLDivElement>({
    onView: useCallback(() => trackFeatureView(id, variant), [id, variant]),
    threshold: 0.3,
  });

  const isAlt = styleVariant === "alt";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      className={`flex flex-col items-center gap-12 ${
        isAlt ? "lg:gap-24" : "sm:flex-row"
      } ${index % 2 === 1 ? (isAlt ? "lg:flex-row-reverse" : "sm:flex-row-reverse") : isAlt ? "lg:flex-row" : ""}`}
    >
      <div
        className={`flex-1 space-y-4 ${isAlt ? "space-y-6 text-center lg:text-left" : "sm:space-y-6"}`}
      >
        <div
          className={`inline-flex items-center justify-center ${
            isAlt
              ? "mb-2 h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100"
              : "h-10 w-10 rounded-xl bg-white shadow-sm ring-1 ring-gray-100 sm:h-12 sm:w-12 sm:rounded-2xl"
          }`}
        >
          {icon}
        </div>
        <h2
          className={
            isAlt
              ? "text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl"
              : "text-2xl font-bold sm:text-4xl"
          }
        >
          {title}
          {tag && (
            <span className="ml-4 inline-flex items-center rounded-full bg-purple-100 px-3 py-1 align-middle text-sm font-medium text-purple-800">
              {tag}
            </span>
          )}
        </h2>
        <p
          className={
            isAlt
              ? "mx-auto max-w-lg text-lg leading-relaxed text-gray-600 sm:text-xl lg:mx-0"
              : "text-base leading-relaxed text-gray-600 sm:text-lg"
          }
        >
          {description}
        </p>
      </div>
      <div
        className={`relative w-full flex-1 overflow-hidden ${
          isAlt
            ? "aspect-[4/3] transform rounded-3xl bg-gray-100 shadow-2xl shadow-gray-200 ring-1 ring-gray-900/5 transition-transform duration-700 hover:scale-[1.02]"
            : "aspect-[16/10] rounded-2xl bg-gray-200 shadow-xl shadow-gray-200 ring-1 ring-gray-900/5 sm:rounded-3xl sm:shadow-2xl"
        }`}
      >
        <picture>
          {/* AVIF source if available */}
          {image.endsWith(".png") && (
            <source
              type="image/avif"
              srcSet={image.replace(".png", ".avif")}
            />
          )}
          {image.endsWith(".webp") && (
            <source
              type="image/avif"
              srcSet={image.replace(".webp", ".avif")}
            />
          )}
          {/* WebP fallback for PNG */}
          {image.endsWith(".png") && (
            <source
              type="image/webp"
              srcSet={image.replace(".png", ".webp")}
            />
          )}
          {/* Fallback to original */}
          <Image
            src={image}
            alt={title}
            fill
            sizes={isAlt ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 640px) 100vw, 50vw"}
            className={`object-cover object-top ${isAlt ? "" : "transition-transform duration-700 hover:scale-105"}`}
            loading="lazy"
          />
        </picture>
        <div
          className={`pointer-events-none absolute inset-0 ${
            isAlt
              ? "rounded-3xl ring-1 ring-inset ring-black/5"
              : "bg-gradient-to-t from-gray-900/10 to-transparent"
          }`}
        />
      </div>
    </motion.div>
  );
}
