import { cn } from "@/lib/utils"
import { HTMLAttributes, forwardRef } from "react"
import { cva, type VariantProps } from "class-variance-authority"

const pageLayoutVariants = cva("min-h-screen flex flex-col", {
    variants: {
        variant: {
            default: "bg-white",
            gradient: "bg-sky-100",
            gray: "bg-gray-50",
        },
        align: {
            default: "",
            center: "items-center justify-center",
        }
    },
    defaultVariants: {
        variant: "default",
        align: "default",
    }
})

export interface PageLayoutProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof pageLayoutVariants> { }

export const PageLayout = forwardRef<HTMLDivElement, PageLayoutProps>(({ className, variant, align, children, ...props }, ref) => {
    return (
        <div ref={ref} className={cn(pageLayoutVariants({ variant, align, className }), "relative overflow-hidden")} {...props}>
                <div className="relative z-10 flex-1 w-full flex flex-col">
                {children}
            </div>
        </div>
    )
})
PageLayout.displayName = "PageLayout"

const pageContainerVariants = cva("w-full mx-auto p-6", {
    variants: {
        size: {
            default: "max-w-7xl",
            sm: "max-w-3xl",
            md: "max-w-5xl",
            full: "max-w-full",
        }
    },
    defaultVariants: {
        size: "default"
    }
})

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof pageContainerVariants> { }

export const PageContainer = forwardRef<HTMLDivElement, PageContainerProps>(({ className, size, ...props }, ref) => {
    return <div ref={ref} className={cn(pageContainerVariants({ size, className }))} {...props} />
})
PageContainer.displayName = "PageContainer"
