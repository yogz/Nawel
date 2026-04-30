"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  defaultValue?: string;
  helper?: string;
  error?: string;
};

export function FormField({
  label,
  name,
  type = "text",
  required = false,
  maxLength,
  placeholder,
  defaultValue,
  helper,
  error,
}: Props) {
  const describedBy = helper || error ? `${name}-help` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name} className="text-[13px] font-medium text-ink-500">
        {label}
        {!required && <span className="ml-1 text-ink-300">(facultatif)</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-describedby={describedBy}
      />
      {(helper || error) && (
        <p id={describedBy} className={error ? "text-xs text-erreur-700" : "text-xs text-ink-400"}>
          {error ?? helper}
        </p>
      )}
    </div>
  );
}
