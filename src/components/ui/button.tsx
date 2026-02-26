import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled}
                className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-300 cursor-pointer",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "active:scale-[0.97]",
                    {
                        "bg-primary-500 text-white hover:bg-primary-600 shadow-md shadow-primary-500/25":
                            variant === "primary",
                        "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]":
                            variant === "secondary",
                        "text-gray-600 hover:bg-gray-100 hover:text-gray-900":
                            variant === "ghost",
                        "bg-red-500 text-white hover:bg-red-600":
                            variant === "danger",
                    },
                    {
                        "px-3 py-1.5 text-sm": size === "sm",
                        "px-5 py-2.5 text-sm": size === "md",
                        "px-7 py-3 text-base": size === "lg",
                    },
                    className
                )}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";
export { Button };
