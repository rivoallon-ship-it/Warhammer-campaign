import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
};

export function Select({
  className,
  label,
  hint,
  error,
  options,
  id,
  ...props
}: SelectProps) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-semibold text-[#f3ead7]">
          {label}
        </span>
      ) : null}
      <select
        id={id}
        className={cn(
          "h-11 w-full rounded-md border border-[#c89a53]/55 bg-[#081012]/80 px-3 text-sm text-[#f3ead7] outline-none transition-colors focus:border-[#d5a653] focus:ring-2 focus:ring-[#d5a653]/20 disabled:cursor-not-allowed disabled:bg-[#15191a]",
          error && "border-[#c76d62] focus:border-[#c76d62] focus:ring-[#c76d62]/20",
          className,
        )}
        aria-invalid={error ? "true" : undefined}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <span className="mt-2 block text-sm text-[#ffd8c9]">{error}</span>
      ) : null}
      {!error && hint ? (
        <span className="fantasy-muted mt-2 block text-sm">{hint}</span>
      ) : null}
    </label>
  );
}
