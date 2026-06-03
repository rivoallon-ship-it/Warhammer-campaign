import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "outlineDark"
  | "ghost"
  | "danger";

type ButtonSize = "sm" | "md" | "lg";

type ButtonVariantOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-[#b84b35] bg-[#9f2f24] text-[#fff4d1] hover:bg-[#b84b35] focus-visible:outline-[#d5a653]",
  secondary:
    "border-[#d5a653]/70 bg-[#2b2214] text-[#f4e6c8] hover:bg-[#3a2b18] focus-visible:outline-[#d5a653]",
  outline:
    "border-[#d5a653]/60 bg-[#0b1113]/35 text-[#f3ead7] hover:bg-[#d5a653]/12 focus-visible:outline-[#d5a653]",
  outlineDark:
    "border-[#f3e7cd]/70 bg-[#211a16]/25 text-[#fffaf0] hover:bg-[#211a16]/45 focus-visible:outline-[#f3e7cd]",
  ghost:
    "border-transparent bg-transparent text-[#f4ce73] hover:bg-[#d5a653]/12 focus-visible:outline-[#d5a653]",
  danger:
    "border-[#a22f2f] bg-[#7e2320] text-[#fff4d1] hover:bg-[#a22f2f] focus-visible:outline-[#c76d62]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: ButtonVariantOptions = {}) {
  return cn(
    "fantasy-action-button inline-flex items-center justify-center rounded-md border font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariantOptions;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
