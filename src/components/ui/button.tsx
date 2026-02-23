import * as React from "react"
import { Slot, Slottable } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-all duration-300 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline:
          "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90 shadow-lg hover:shadow-xl border-0",
        glass: "bg-white/60 backdrop-blur-md border border-white/70 text-gray-700 hover:bg-white/80 shadow-sm hover:shadow-md font-semibold",
        "glass-destructive": "bg-red-50/60 backdrop-blur-md border border-red-200/60 text-red-600 hover:bg-red-100/80 shadow-sm hover:shadow-md font-semibold",
        "glass-overlay": "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-10 w-10",
      },
      shape: {
        default: "rounded-md",
        pill: "rounded-full",
        square: "rounded-none",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, asChild = false, iconLeft, iconRight, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, shape, className }))}
        ref={ref}
        {...props}
      >
        {iconLeft && <span className="mr-2 flex items-center justify-center">{iconLeft}</span>}
        <Slottable>{children}</Slottable>
        {iconRight && <span className="ml-2 flex items-center justify-center">{iconRight}</span>}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
