import { cn } from "@/lib/utils"
import { HTMLAttributes, forwardRef } from "react"
import { cva, type VariantProps } from "class-variance-authority"

const headingVariants = cva("font-bold tracking-tighter", {
  variants: {
    level: {
      h1: "text-5xl md:text-7xl text-foreground",
      h2: "text-3xl md:text-4xl text-foreground font-semibold tracking-tight",
      h3: "text-2xl md:text-3xl text-foreground font-semibold tracking-tight",
      h4: "text-xl md:text-2xl text-foreground font-semibold tracking-tight"
    }
  },
  defaultVariants: {
    level: "h1"
  }
})

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement>, VariantProps<typeof headingVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(({ className, as, level, ...props }, ref) => {
  const Component = as || (level ? (level as any) : "h1")
  return <Component ref={ref} className={cn(headingVariants({ level, className }))} {...props} />
})
Heading.displayName = "Heading"

const gradientTextVariants = cva("text-transparent bg-clip-text", {
  variants: {
    variant: {
      default: "bg-gradient-to-r from-indigo-600 to-purple-600",
      secondary: "bg-gradient-to-r from-pink-500 to-violet-500",
    }
  },
  defaultVariants: {
    variant: "default"
  }
})

export interface GradientTextProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof gradientTextVariants> { }

export const GradientText = forwardRef<HTMLSpanElement, GradientTextProps>(({ className, variant, ...props }, ref) => {
  return <span ref={ref} className={cn(gradientTextVariants({ variant, className }))} {...props} />
})
GradientText.displayName = "GradientText"

const textVariants = cva("text-muted-foreground", {
  variants: {
    size: {
      default: "text-base",
      sm: "text-sm",
      lg: "text-lg",
      xl: "text-xl md:text-2xl",
    }
  },
  defaultVariants: {
    size: "default"
  }
})

export interface TextProps extends HTMLAttributes<HTMLParagraphElement>, VariantProps<typeof textVariants> {
  as?: "p" | "span" | "div"
}

export const Text = forwardRef<HTMLParagraphElement, TextProps>(({ className, as: Component = "p", size, ...props }, ref) => {
  return <Component ref={ref} className={cn(textVariants({ size, className }))} {...props} />
})
Text.displayName = "Text"
