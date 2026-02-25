"use client"

import { useState, useRef, useCallback } from "react"
import { motion, useAnimation } from "framer-motion"
import { Loader2 } from "lucide-react"

const THRESHOLD = 80

export function PullToRefresh({
    onRefresh,
    children,
    className
}: {
    onRefresh: () => Promise<void>
    children: React.ReactNode
    className?: string
}) {
    const [pullDistance, setPullDistance] = useState(0)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const startY = useRef(0)
    const controls = useAnimation()

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
        if (scrollTop <= 0) {
            startY.current = e.touches[0].clientY
        }
    }, [])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (isRefreshing || startY.current === 0) return
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
        if (scrollTop > 0) return

        const currentY = e.touches[0].clientY
        const diff = Math.max(0, currentY - startY.current)
        // Diminishing returns for overscroll feel
        const distance = Math.min(diff * 0.5, 120)
        setPullDistance(distance)
    }, [isRefreshing])

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance >= THRESHOLD && !isRefreshing) {
            setIsRefreshing(true)
            setPullDistance(THRESHOLD)
            try {
                await onRefresh()
            } finally {
                setIsRefreshing(false)
                setPullDistance(0)
                startY.current = 0
            }
        } else {
            setPullDistance(0)
            startY.current = 0
        }
    }, [pullDistance, isRefreshing, onRefresh])

    const progress = Math.min(pullDistance / THRESHOLD, 1)

    return (
        <div
            className={className}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull indicator */}
            <motion.div
                className="flex items-center justify-center overflow-hidden"
                animate={{ height: pullDistance }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
                {pullDistance > 10 && (
                    <motion.div
                        animate={{ rotate: isRefreshing ? 360 : progress * 180 }}
                        transition={isRefreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : { duration: 0 }}
                    >
                        <Loader2
                            className="w-5 h-5 text-indigo-500"
                            style={{ opacity: progress }}
                        />
                    </motion.div>
                )}
            </motion.div>
            {children}
        </div>
    )
}
