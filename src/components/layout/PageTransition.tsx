"use client"

import { motion } from "framer-motion"

const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    animate: {
        opacity: 1,
        y: 0,
    },
    exit: {
        opacity: 0,
        y: -10,
    },
}

const pageTransition = {
    type: "tween" as const,
    ease: "easeOut" as const,
    duration: 0.2,
}

export function PageTransition({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
            className="flex-1 flex flex-col"
        >
            {children}
        </motion.div>
    )
}
