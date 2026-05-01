import { UserAvatar } from "./user-avatar";

export type AvatarVM = {
  name: string | null;
  image: string | null;
};

type Props = {
  avatars: AvatarVM[];
  total?: number;
  size?: number;
  max?: number;
};

/**
 * Empilement circulaire d'avatars qui se chevauchent. Quand on dépasse
 * `max`, on rend une bulle `+N` en queue plutôt qu'un overflow infini.
 *
 * `total` est optionnel — utile quand le caller a un compteur agrégé
 * plus précis que `avatars.length` (ex. server-paginé). Sans lui on
 * retombe sur la longueur du tableau.
 */
export function AvatarStack({ avatars, total, size = 28, max = 4 }: Props) {
  const visible = avatars.slice(0, max);
  const totalCount = total ?? avatars.length;
  const overflow = totalCount - visible.length;
  return (
    <div className="flex">
      {visible.map((a, i) => (
        <span
          key={i}
          className="-ml-1.5 inline-block rounded-full ring-2 ring-surface-50 first:ml-0"
          style={{ width: size, height: size }}
        >
          <UserAvatar name={a.name} image={a.image} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="-ml-1.5 inline-flex items-center justify-center rounded-full bg-surface-100 font-mono tracking-[0.04em] text-ink-400 uppercase ring-2 ring-surface-50"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
