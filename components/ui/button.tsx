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
    "border-[#b84b35] bg-[#b84b35] text-white hover:bg-[#9f3f2b] focus-visible:outline-[#b84b35]",
  secondary:
    "border-[#e9d7a5] bg-[#fff7e7] text-[#211a16] hover:bg-[#f4e6c8] focus-visible:outline-[#a77b24]",
  outline:
    "border-[#c8bca7] bg-transparent text-[#211a16] hover:bg-[#efe4d1] focus-visible:outline-[#7b6651]",
  outlineDark:
    "border-[#f3e7cd]/70 bg-[#211a16]/25 text-[#fffaf0] hover:bg-[#211a16]/45 focus-visible:outline-[#f3e7cd]",
  ghost:
    "border-transparent bg-transparent text-[#5d3328] hover:bg-[#efe4d1] focus-visible:outline-[#b84b35]",
  danger:
    "border-[#a22f2f] bg-[#a22f2f] text-white hover:bg-[#842323] focus-visible:outline-[#a22f2f]",
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
    "inline-flex items-center justify-center rounded-md border font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
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
