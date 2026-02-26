import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, id, ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && (
                    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={id}
                    className={cn(
                        "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all resize-none",
                        "placeholder:text-gray-400",
                        "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);

Textarea.displayName = "Textarea";
export { Textarea };
