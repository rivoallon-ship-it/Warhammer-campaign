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
        <span className="mb-2 block text-sm font-semibold text-[#302720]">
          {label}
        </span>
      ) : null}
      <select
        id={id}
        className={cn(
          "h-11 w-full rounded-md border border-[#c8bca7] bg-[#fffdf8] px-3 text-sm text-[#211a16] outline-none transition-colors focus:border-[#b84b35] focus:ring-2 focus:ring-[#b84b35]/20 disabled:cursor-not-allowed disabled:bg-[#eee6d8]",
          error && "border-[#a22f2f] focus:border-[#a22f2f] focus:ring-[#a22f2f]/20",
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
        <span className="mt-2 block text-sm text-[#a22f2f]">{error}</span>
      ) : null}
      {!error && hint ? (
        <span className="mt-2 block text-sm text-[#6a5e54]">{hint}</span>
      ) : null}
    </label>
  );
}
