const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

export function buildWhatsAppMessage(args: {
  title: string;
  url: string;
  startsAt: Date | null;
}): string {
  const { title, url, startsAt } = args;
  const dateBit = startsAt ? ` le ${dateFormatter.format(startsAt)}` : "";
  return `🎭 ${title}${dateBit}. Tu viens ? ${url}`;
}

export function buildWhatsAppHref(args: {
  title: string;
  url: string;
  startsAt: Date | null;
}): string {
  return `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(args))}`;
}
