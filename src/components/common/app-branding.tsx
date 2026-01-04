import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface AppBrandingProps {
  href?: string;
  className?: string;
  logoSize?: number;
  textSize?: "sm" | "md" | "lg";
  onClick?: () => void;
  variant?: "icon-text" | "text-only" | "icon-text-logos" | "icon";
}

const textSizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function AppBranding({
  href = "/",
  className,
  logoSize = 32,
  textSize = "md",
  onClick,
  variant = "icon-text",
}: AppBrandingProps) {
  let content;

  if (variant === "text-only") {
    content = (
      <div className={cn("flex items-center", className)}>
        <Image
          src="/LogoText.png"
          alt="CoList Logo"
          width={logoSize * 3.88}
          height={logoSize}
          className="shrink-0"
          priority
        />
      </div>
    );
  } else if (variant === "icon-text-logos") {
    content = (
      <div className={cn("flex items-center gap-2.5", className)}>
        <Image
          src="/LogoIcon.png"
          alt="CoList Icon"
          width={logoSize * 0.96}
          height={logoSize}
          className="shrink-0"
          priority
        />
        <Image
          src="/LogoText.png"
          alt="CoList Text"
          width={logoSize * 2.33}
          height={logoSize * 0.6}
          className="shrink-0"
          priority
        />
      </div>
    );
  } else if (variant === "icon") {
    content = (
      <div className={cn("flex items-center", className)}>
        <Image
          src="/LogoIcon.png"
          alt="CoList Logo"
          width={logoSize}
          height={logoSize}
          className="shrink-0"
          priority
        />
      </div>
    );
  } else {
    // default: icon-text
    content = (
      <div className={cn("flex items-center gap-2.5", className)}>
        <Image
          src="/LogoIcon.png"
          alt="CoList Logo"
          width={logoSize}
          height={logoSize}
          className="shrink-0"
          priority
        />
        <div
          className={cn(
            "flex items-baseline leading-none tracking-[-0.02em]",
            textSizeClasses[textSize]
          )}
          style={{ fontFamily: "'Poppins', 'Futura', 'Sofia Pro', system-ui, sans-serif" }}
        >
          <span className="font-normal" style={{ color: "#1A1A1B" }}>
            Co
          </span>
          <span className="font-light" style={{ color: "#1A1A1B" }}>
            List
          </span>
        </div>
      </div>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="transition-opacity hover:opacity-80">
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className="transition-opacity hover:opacity-80">
      {content}
    </Link>
  );
}
