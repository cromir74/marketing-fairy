import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    isHoverable?: boolean;
}

export function Card({ className, children, isHoverable = false, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]",
                isHoverable && "transition-all duration-300 cursor-default hover:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.12)] hover:-translate-y-1.5",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("mb-4", className)} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3 className={cn("text-lg font-bold text-gray-900", className)} {...props}>
            {children}
        </h3>
    );
}

export function CardDescription({
    className,
    children,
    ...props
}: HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p className={cn("text-sm text-gray-500 mt-1", className)} {...props}>
            {children}
        </p>
    );
}
