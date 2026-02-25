"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

const EDGE_WIDTH = 25 // Touch zone from left edge
const SWIPE_THRESHOLD = 80 // Min distance to trigger back

export function SwipeBack({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const startX = useRef(0)
    const startY = useRef(0)
    const [swipeDistance, setSwipeDistance] = useState(0)
    const isSwipingRef = useRef(false)

    // Only enable on sub-pages (not main dashboard tabs)
    const isSubPage = pathname.split('/').filter(Boolean).length > 2

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (!isSubPage) return
        const touch = e.touches[0]
        if (touch.clientX <= EDGE_WIDTH) {
            startX.current = touch.clientX
            startY.current = touch.clientY
            isSwipingRef.current = true
        }
    }, [isSubPage])

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isSwipingRef.current) return
        const touch = e.touches[0]
        const diffX = touch.clientX - startX.current
        const diffY = Math.abs(touch.clientY - startY.current)

        // If vertical movement is greater, cancel the swipe
        if (diffY > 30 && diffX < 30) {
            isSwipingRef.current = false
            setSwipeDistance(0)
            return
        }

        if (diffX > 0) {
            setSwipeDistance(Math.min(diffX, 200))
        }
    }, [])

    const handleTouchEnd = useCallback(() => {
        if (swipeDistance >= SWIPE_THRESHOLD) {
            router.back()
        }
        setSwipeDistance(0)
        isSwipingRef.current = false
        startX.current = 0
    }, [swipeDistance, router])

    useEffect(() => {
        document.addEventListener('touchstart', handleTouchStart, { passive: true })
        document.addEventListener('touchmove', handleTouchMove, { passive: true })
        document.addEventListener('touchend', handleTouchEnd)

        return () => {
            document.removeEventListener('touchstart', handleTouchStart)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleTouchEnd)
        }
    }, [handleTouchStart, handleTouchMove, handleTouchEnd])

    return (
        <>
            {/* Swipe indicator edge line */}
            {swipeDistance > 10 && (
                <div
                    className="fixed left-0 top-0 bottom-0 z-[100] pointer-events-none"
                    style={{
                        width: `${Math.min(swipeDistance * 0.3, 40)}px`,
                        background: `linear-gradient(to right, rgba(99, 102, 241, ${Math.min(swipeDistance / 200, 0.3)}), transparent)`,
                        transition: 'none',
                    }}
                />
            )}
            {children}
        </>
    )
}
