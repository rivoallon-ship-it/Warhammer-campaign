import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "lobby"
  | "active";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border-[#c8bca7] bg-[#efe7d8] text-[#3f352c]",
  success: "border-[#6fa07e] bg-[#e1f0e4] text-[#23543b]",
  warning: "border-[#c99a3d] bg-[#f7e7bf] text-[#644512]",
  danger: "border-[#c76d62] bg-[#f4d9d4] text-[#7b2922]",
  info: "border-[#7395bd] bg-[#ddeafa] text-[#284d77]",
  lobby: "border-[#a77b24] bg-[#efe4ba] text-[#5b3c0a]",
  active: "border-[#348a67] bg-[#d7eadf] text-[#1e5942]",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
