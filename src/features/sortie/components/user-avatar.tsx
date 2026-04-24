import Image from "next/image";

type Props = {
  name: string | null | undefined;
  image?: string | null;
  size?: number;
  className?: string;
};

function initials(name: string | null | undefined): string {
  if (!name) {
    return "?";
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function UserAvatar({ name, image, size = 36, className }: Props) {
  const dim = `${size}px`;
  const fontSize = Math.round(size * 0.36);

  if (image) {
    // `blob:` / `data:` URLs come from the optimistic crop preview in
    // AvatarPicker. They have no hostname for `remotePatterns` to match,
    // so handing them to `next/image` throws "Invalid src prop". Render
    // a plain <img> for those — they're local-only, never worth
    // optimising, and the network round-trip is zero.
    const local = image.startsWith("blob:") || image.startsWith("data:");
    if (local) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name ?? "Avatar"}
          width={size}
          height={size}
          className={`rounded-full object-cover ${className ?? ""}`}
          style={{ width: dim, height: dim }}
        />
      );
    }
    return (
      <Image
        src={image}
        alt={name ?? "Avatar"}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className ?? ""}`}
      />
    );
  }

  return (
    <span
      aria-label={name ?? "Avatar"}
      className={`grid place-items-center rounded-full bg-bordeaux-600 text-ivoire-50 ${className ?? ""}`}
      style={{ width: dim, height: dim, fontSize }}
    >
      <span className="font-semibold tracking-tight">{initials(name)}</span>
    </span>
  );
}
