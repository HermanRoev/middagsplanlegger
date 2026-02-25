import * as React from "react"
import { cn } from "@/lib/utils"
import { Filter, Zap } from "lucide-react"

export function PageHeader({
    title,
    description,
    children,
    className
}: {
    title: React.ReactNode,
    description?: React.ReactNode,
    children?: React.ReactNode,
    className?: string
}) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 w-full", className)}>
            <div className="flex-1 flex flex-col justify-end">
                {description && <div className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1 line-clamp-1 sm:line-clamp-none">{description}</div>}
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">{title}</h1>
            </div>
            {children && (
                <div className="flex items-center gap-2">
                    {children}
                </div>
            )}
        </div>
    )
}

// ─── FilterBar ───────────────────────────────────────────────────────────────

export interface FilterOption {
    id: string
    label: string
}

export function FilterBar({
    filters,
    activeFilter,
    onFilterChange,
    className
}: {
    filters: FilterOption[]
    activeFilter: string | null
    onFilterChange: (id: string | null) => void
    className?: string
}) {
    return (
        <div className={cn("flex items-center gap-2 overflow-x-auto no-scrollbar", className)}>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl mr-2 flex-shrink-0">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filter</span>
            </div>
            {filters.map(filter => (
                <button
                    key={filter.id}
                    onClick={() => onFilterChange(activeFilter === filter.id ? null : filter.id)}
                    className={cn(
                        "px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap border flex-shrink-0",
                        activeFilter === filter.id
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    )}
                >
                    {filter.label}
                </button>
            ))}
            {activeFilter && (
                <button
                    onClick={() => onFilterChange(null)}
                    className="text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors ml-4 underline underline-offset-4 flex-shrink-0"
                >
                    Nullstill
                </button>
            )}
        </div>
    )
}

// ─── QuickAddBar ─────────────────────────────────────────────────────────────

export function QuickAddBar({
    items,
    onAdd,
    label = "Hurtigvalg",
    className
}: {
    items: string[]
    onAdd: (item: string) => void
    label?: string
    className?: string
}) {
    return (
        <div className={cn("relative", className)}>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl mr-2 flex-shrink-0">
                    <Zap className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
                </div>
                {items.map(item => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => onAdd(item)}
                        className="px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap border flex-shrink-0 bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 active:scale-95"
                    >
                        + {item}
                    </button>
                ))}
            </div>
            {/* Fade indicator showing more pills are available */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 to-transparent pointer-events-none sm:hidden" />
        </div>
    )
}

// ─── EmptyStateBlock ──────────────────────────────────────────────────────────

export function EmptyStateBlock({
    icon: Icon,
    title,
    description,
    children,
    className
}: {
    icon?: React.ElementType,
    title: string,
    description?: string,
    children?: React.ReactNode,
    className?: string
}) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-20 px-4 text-center text-gray-400 bg-gray-50/50 rounded-[24px] border-2 border-dashed border-gray-100", className)}>
            {Icon && <Icon className="w-16 h-16 mb-4 opacity-20" />}
            <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
            {description && <p className="text-sm max-w-sm mb-6">{description}</p>}
            {children}
        </div>
    )
}
