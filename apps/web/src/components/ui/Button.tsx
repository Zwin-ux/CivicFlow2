import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
                outline:
                    "border border-outline bg-transparent hover:bg-secondary/10 text-primary",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
                ghost: "hover:bg-secondary/10 text-on-surface",
                link: "text-primary underline-offset-4 hover:underline",
                tonal: "bg-secondary/20 text-secondary-foreground hover:bg-secondary/30",
            },
            size: {
                default: "h-10 px-6 py-2",
                sm: "h-8 rounded-full px-4 text-xs",
                lg: "h-12 rounded-full px-8 text-base",
                icon: "h-10 w-10 rounded-full",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
    loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, loading, children, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={props.disabled || loading}
                {...props}
            >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
