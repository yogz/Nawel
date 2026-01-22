"use client";

import * as React from "react";
import { format, type Locale } from "date-fns";
import { da, de, el, enUS, es, fr, it, nl, pl, pt, sv, tr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useLocale } from "next-intl";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const localeMap: Record<string, Locale> = {
  da,
  de,
  el,
  en: enUS,
  es,
  fr,
  it,
  nl,
  pl,
  pt,
  sv,
  tr,
};

export interface DatePickerProps {
  /** The selected date */
  value?: Date;
  /** Callback when date changes */
  onChange?: (date: Date | undefined) => void;
  /** Placeholder text when no date is selected */
  placeholder?: string;
  /** Disable dates before this date */
  fromDate?: Date;
  /** Disable dates after this date */
  toDate?: Date;
  /** Additional class names for the trigger button */
  className?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Optional custom trigger */
  children?: React.ReactNode;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  fromDate,
  toDate,
  className,
  disabled,
  children,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const localeCode = useLocale();
  const dateLocale = localeMap[localeCode] || fr;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Render a static button during SSR to avoid hydration mismatch
  if (!mounted) {
    if (children) return <>{children}</>;

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
        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
        {value ? (
          <span className="truncate">{format(value, "d MMM yyyy", { locale: dateLocale })}</span>
        ) : (
          <span className="truncate">{placeholder}</span>
        )}
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
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {value ? (
              <span className="truncate">
                {format(value, "d MMM yyyy", { locale: dateLocale })}
              </span>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          fromDate={fromDate}
          toDate={toDate}
          locale={dateLocale}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
