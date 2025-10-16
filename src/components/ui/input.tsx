import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.ComponentPropsWithoutRef<"input">;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function InputComponent(
  { className, type, ...props }: InputProps,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  const inputType = type ?? "text";
    return (
      <input
        type={inputType}
        className={cn(
          "block w-full rounded-none border border-foreground/70 bg-background px-4 py-3 text-foreground shadow-[4px_4px_0_0_rgba(0,0,0,0.4)] outline-none transition", 
          "focus:border-foreground focus:shadow-[6px_6px_0_0_rgba(0,0,0,0.5)]", 
          "disabled:pointer-events-none disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
