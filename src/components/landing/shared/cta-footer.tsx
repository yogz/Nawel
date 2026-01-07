"use client";

import { Link } from "@/i18n/navigation";
import { sendGAEvent } from "@next/third-parties/google";

interface CtaFooterProps {
  variant: string;
  title: string;
  description: string;
  buttonText: string;
  notice?: string;
  /** Visual style variant */
  styleVariant?: "default" | "alt";
}

export function CtaFooter({
  variant,
  title,
  description,
  buttonText,
  notice,
  styleVariant = "default",
}: CtaFooterProps) {
  const isAlt = styleVariant === "alt";

  return (
    <section
      className={`relative z-10 px-6 text-center ${
        isAlt ? "overflow-hidden bg-white py-24 sm:py-32" : "bg-white py-20 sm:py-32"
      }`}
    >
      {isAlt && (
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white opacity-70" />
      )}
      <div className="mx-auto max-w-4xl">
        <h2
          className={`mb-6 font-bold sm:mb-8 ${
            isAlt ? "text-4xl tracking-tight text-gray-900 sm:text-6xl" : "text-3xl sm:text-6xl"
          }`}
        >
          {title}
        </h2>
        <p
          className={`mb-8 text-gray-600 sm:mb-12 ${
            isAlt ? "mx-auto max-w-2xl text-xl" : "text-lg sm:text-xl"
          }`}
        >
          {description}
        </p>
        <Link
          href="/login?mode=user"
          onClick={() => sendGAEvent("event", "cta_click", { location: "footer", variant })}
          className={`inline-flex w-full items-center justify-center rounded-full font-bold text-white transition-all sm:w-auto ${
            isAlt
              ? "bg-gray-900 px-10 py-5 text-xl shadow-xl hover:scale-105 hover:bg-gray-800 hover:shadow-2xl"
              : "bg-red-600 px-8 py-4 text-lg hover:bg-red-700 sm:px-10 sm:py-5 sm:text-xl"
          }`}
        >
          {buttonText}
        </Link>
        {notice && <p className="mt-6 text-sm text-gray-500">{notice}</p>}
      </div>
    </section>
  );
}
