"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  name: string;
  defaultValue?: string;
  minuteStep?: number;
  required?: boolean;
  placeholder?: string;
  // Fired whenever the user picks a new date or time. The argument is the
  // same local-ISO string that lands in the hidden input (empty when the
  // value was cleared). Added for the vote-mode timeslot editor, which
  // needs to mirror each slot's value into a JSON-encoded array field.
  onChange?: (value: string) => void;
};

const DISPLAY = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});

// Form submission emits a UTC ISO with `Z`, not the "local-naive"
// `YYYY-MM-DDTHH:mm` we used to ship. The previous format was ambiguous
// on the server: `z.coerce.date()` does `new Date(...)` which, on a
// string without timezone, interprets it as the *server* local time
// (Vercel Functions = UTC), so a "21:30 Paris" submission landed in DB
// as 21:30 UTC, then drifted +2 h on every subsequent edit because the
// modifier form re-formatted the bumped value back to Paris and re-sent
// it. Sending an unambiguous UTC instant breaks that loop — see also
// `create-wizard/index.tsx` for the same fix on the create path.
function toUtcIsoString(date: Date): string {
  return date.toISOString();
}

function parseLocalIsoString(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildTimeOptions(step: number): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}

export function DateTimePicker({
  name,
  defaultValue,
  minuteStep = 15,
  required = false,
  placeholder = "Choisir une date",
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Date | null>(parseLocalIsoString(defaultValue));
  const timeOptions = useMemo(() => buildTimeOptions(minuteStep), [minuteStep]);
  const timeListRef = useRef<HTMLDivElement>(null);

  // Mirror the current value to the onChange callback whenever it shifts.
  // Keep the callback in a ref so parents that pass an inline closure (very
  // common) don't re-fire the effect on every render — only a committed value
  // change should trigger it.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onChangeRef.current?.(value ? toUtcIsoString(value) : "");
  }, [value]);

  const selectedTime = value
    ? `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
    : null;

  // Scroll the selected hour into view once the popover is mounted so the user
  // doesn't land on "00:00" every time they open the picker.
  useEffect(() => {
    if (!open || !timeListRef.current) {
      return;
    }
    const target = selectedTime ?? defaultHourString();
    const node = timeListRef.current.querySelector(`[data-time="${target}"]`);
    if (node) {
      requestAnimationFrame(() =>
        (node as HTMLElement).scrollIntoView({ block: "center", behavior: "instant" })
      );
    }
  }, [open, selectedTime]);

  const handleDateSelect = (day: Date | undefined) => {
    if (!day) {
      return;
    }
    const next = new Date(day);
    if (value) {
      next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    } else {
      next.setHours(20, 0, 0, 0);
    }
    setValue(next);
  };

  const handleTimePick = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const base = value ? new Date(value) : new Date();
    base.setHours(h, m, 0, 0);
    setValue(base);
    setOpen(false);
  };

  const label = value
    ? `${DISPLAY.format(value)} · ${selectedTime?.replace(":", "h")}`
    : placeholder;
  const hiddenValue = value ? toUtcIsoString(value) : "";

  return (
    <>
      <input type="hidden" name={name} value={hiddenValue} required={required} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="group flex h-11 w-full items-center justify-between rounded-md border border-ivoire-400 bg-ivoire-50 px-3 text-left text-sm text-encre-700 transition-colors hover:border-or-500 focus-visible:border-or-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-or-500/30"
          >
            <span className={value ? "" : "text-encre-300"}>{label}</span>
            <CalendarIcon size={16} className="text-or-600" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="theme-sortie w-auto bg-ivoire-50 p-0">
          <div className="flex flex-col divide-y divide-ivoire-400 md:flex-row md:divide-x md:divide-y-0">
            <Calendar
              mode="single"
              selected={value ?? undefined}
              onSelect={handleDateSelect}
              locale={fr}
              weekStartsOn={1}
              className="[--cell-size:2.25rem]"
            />
            <div className="flex flex-col gap-2 p-3">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-or-600">
                Heure
              </p>
              <div ref={timeListRef} className="h-[240px] w-[5.5rem] overflow-y-auto">
                <div className="flex flex-col gap-0.5 pr-1">
                  {timeOptions.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        data-time={time}
                        onClick={() => handleTimePick(time)}
                        className={`rounded-md px-2 py-1.5 text-sm transition-colors ${
                          isSelected
                            ? "bg-bordeaux-600 text-ivoire-100"
                            : "text-encre-600 hover:bg-ivoire-200"
                        }`}
                      >
                        {time.replace(":", "h")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

function defaultHourString(): string {
  const now = new Date();
  const rounded = Math.round(now.getMinutes() / 15) * 15;
  const h = rounded === 60 ? (now.getHours() + 1) % 24 : now.getHours();
  const m = rounded === 60 ? 0 : rounded;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
