import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const baseClasses = "relative inline-flex items-center justify-center border-2 border-foreground bg-background px-6 py-3 text-base font-handdrawn uppercase tracking-wide transition-transform duration-150 ease-out shadow-[6px_6px_0_0_rgba(0,0,0,0.45)]";

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", children, ...props }: ButtonProps,
  ref: React.ForwardedRef<HTMLButtonElement>
) {
  const variantClasses =
    variant === "ghost"
      ? "bg-transparent shadow-none border-dashed border-foreground/70"
      : "hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_0_rgba(0,0,0,0.5)]";

  return (
    <button
      ref={ref}
      className={cn(baseClasses, variantClasses, className)}
      {...props}
    >
      <span className="pointer-events-none select-none text-foreground">{children}</span>
    </button>
  );
});

Button.displayName = "Button";
