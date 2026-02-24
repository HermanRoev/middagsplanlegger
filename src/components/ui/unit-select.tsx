import * as React from "react"
import { cn } from "@/lib/utils"

export const UNITS = ['g', 'kg', 'l', 'dl', 'stk', 'ts', 'ss'] as const

export function UnitSelect({
    value,
    onChange,
    className
}: {
    value: string
    onChange: (value: string) => void
    className?: string
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
                "min-h-[56px] rounded-[24px] border border-white/50 bg-white/40 backdrop-blur-md px-5 py-4 font-bold text-gray-900 shadow-sm transition-all duration-200 outline-none focus:ring-2 focus:ring-white/80 focus:border-white",
                className
            )}
        >
            {UNITS.map(u => (
                <option key={u} value={u}>{u}</option>
            ))}
        </select>
    )
}
