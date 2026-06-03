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
  neutral: "border-[#c89a53]/55 bg-[#10191b] text-[#eadfc9]",
  success: "border-[#6fa07e]/70 bg-[#143621] text-[#d8f0dd]",
  warning: "border-[#c99a3d]/80 bg-[#332512] text-[#f7d78a]",
  danger: "border-[#c76d62]/75 bg-[#3a1513] text-[#ffd8c9]",
  info: "border-[#7395bd]/70 bg-[#15314a] text-[#d8e8ff]",
  lobby: "border-[#d5a653]/80 bg-[#3a2b18] text-[#f4ce73]",
  active: "border-[#348a67]/80 bg-[#173a29] text-[#d7eadf]",
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
