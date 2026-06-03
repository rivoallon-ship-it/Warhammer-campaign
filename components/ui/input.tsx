import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Input({ className, label, hint, error, id, ...props }: InputProps) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-semibold text-[#f3ead7]">
          {label}
        </span>
      ) : null}
      <input
        id={id}
        className={cn(
          "h-11 w-full rounded-md border border-[#c89a53]/55 bg-[#081012]/80 px-3 text-sm text-[#f3ead7] outline-none transition-colors placeholder:text-[#9b8c78] focus:border-[#d5a653] focus:ring-2 focus:ring-[#d5a653]/20 disabled:cursor-not-allowed disabled:bg-[#15191a]",
          error && "border-[#c76d62] focus:border-[#c76d62] focus:ring-[#c76d62]/20",
          className,
        )}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {error ? (
        <span className="mt-2 block text-sm text-[#ffd8c9]">{error}</span>
      ) : null}
      {!error && hint ? (
        <span className="fantasy-muted mt-2 block text-sm">{hint}</span>
      ) : null}
    </label>
  );
}
