"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { useLocale } from "next-intl";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface TimePickerProps {
  /** The selected time in HH:mm format */
  value?: string;
  /** Callback when time changes */
  onChange?: (time: string) => void;
  /** Placeholder text when no time is selected */
  placeholder?: string;
  /** Additional class names for the trigger button */
  className?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Minute interval (default: 15) */
  minuteInterval?: number;
  /** Optional custom trigger */
  children?: React.ReactNode;
}

// Generate time options
function generateTimeOptions(minuteInterval: number = 15): string[] {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += minuteInterval) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      times.push(`${h}:${m}`);
    }
  }
  return times;
}

// Format time for display using locale
function formatTimeDisplay(time: string, locale: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);

  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function TimePicker({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  minuteInterval = 15,
  children,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const locale = useLocale();
  const timeOptions = React.useMemo(() => generateTimeOptions(minuteInterval), [minuteInterval]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll to selected time when popover opens
  React.useEffect(() => {
    if (open && scrollRef.current) {
      // Use provided value, or current time rounded to nearest interval
      let scrollTarget = value;
      if (!scrollTarget) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        // Round to nearest interval
        const roundedMinute = Math.round(currentMinute / minuteInterval) * minuteInterval;
        const adjustedHour = roundedMinute >= 60 ? currentHour + 1 : currentHour;
        const finalHour = adjustedHour % 24;
        const finalMinute = roundedMinute % 60;
        scrollTarget = `${String(finalHour).padStart(2, "0")}:${String(finalMinute).padStart(2, "0")}`;
      }
      const selectedIndex = timeOptions.indexOf(scrollTarget);

      if (selectedIndex !== -1) {
        // Use requestAnimationFrame + timeout to ensure popover is fully rendered
        const scrollToTime = () => {
          const itemHeight = 40; // Approximate height of each item
          if (scrollRef.current) {
            const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
            if (viewport) {
              viewport.scrollTop = Math.max(0, selectedIndex * itemHeight - 80);
            }
          }
        };

        // Try multiple times to ensure the scroll works
        requestAnimationFrame(() => {
          setTimeout(scrollToTime, 50);
        });
      }
    }
  }, [open, value, timeOptions, minuteInterval]);

  // Render a static button during SSR to avoid hydration mismatch
  if (!mounted && !children) {
    return (
      <Button
        variant="outline"
        disabled={disabled}
        className={cn(
          "w-full justify-start text-left font-medium",
          !value && "text-muted-foreground",
          className
        )}
      >
        <Clock className="mr-2 h-4 w-4 shrink-0" />
        {value ? formatTimeDisplay(value, locale) : <span>{placeholder}</span>}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-medium",
              !value && "text-muted-foreground",
              className
            )}
          >
            <Clock className="mr-2 h-4 w-4 shrink-0" />
            {value ? formatTimeDisplay(value, locale) : <span>{placeholder}</span>}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <ScrollArea className="h-[280px]" ref={scrollRef}>
          <div className="p-2">
            {timeOptions.map((time) => (
              <Button
                key={time}
                variant={value === time ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start font-medium mb-1",
                  value === time && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  onChange?.(time);
                  setOpen(false);
                }}
              >
                {formatTimeDisplay(time, locale)}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
