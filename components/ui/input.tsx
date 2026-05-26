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
        <span className="mb-2 block text-sm font-semibold text-[#302720]">
          {label}
        </span>
      ) : null}
      <input
        id={id}
        className={cn(
          "h-11 w-full rounded-md border border-[#c8bca7] bg-[#fffdf8] px-3 text-sm text-[#211a16] outline-none transition-colors placeholder:text-[#8a7d70] focus:border-[#b84b35] focus:ring-2 focus:ring-[#b84b35]/20 disabled:cursor-not-allowed disabled:bg-[#eee6d8]",
          error && "border-[#a22f2f] focus:border-[#a22f2f] focus:ring-[#a22f2f]/20",
          className,
        )}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {error ? (
        <span className="mt-2 block text-sm text-[#a22f2f]">{error}</span>
      ) : null}
      {!error && hint ? (
        <span className="mt-2 block text-sm text-[#6a5e54]">{hint}</span>
      ) : null}
    </label>
  );
}
