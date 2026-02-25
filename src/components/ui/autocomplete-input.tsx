"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface AutocompleteInputProps {
    suggestions: string[]
    value: string
    onChange: (value: string) => void
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
    placeholder?: string
    className?: string
    inputClassName?: string
}

export function AutocompleteInput({
    suggestions,
    value,
    onChange,
    onKeyDown: parentOnKeyDown,
    placeholder,
    className,
    inputClassName,
}: AutocompleteInputProps) {
    const [isFocused, setIsFocused] = React.useState(false)
    const [highlightIndex, setHighlightIndex] = React.useState(-1)
    const wrapperRef = React.useRef<HTMLDivElement>(null)

    const filtered = React.useMemo(() => {
        if (!value.trim()) return suggestions.slice(0, 8)
        const q = value.toLowerCase()
        return suggestions
            .filter(s => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
            .slice(0, 8)
    }, [value, suggestions])

    const showDropdown = isFocused && filtered.length > 0

    const handleSelect = (item: string) => {
        onChange(item)
        setIsFocused(false)
        setHighlightIndex(-1)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (showDropdown) {
            if (e.key === "ArrowDown") {
                e.preventDefault()
                setHighlightIndex(prev => Math.min(prev + 1, filtered.length - 1))
                return
            } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setHighlightIndex(prev => Math.max(prev - 1, 0))
                return
            } else if (e.key === "Enter" && highlightIndex >= 0) {
                e.preventDefault()
                handleSelect(filtered[highlightIndex])
                return
            } else if (e.key === "Escape") {
                setIsFocused(false)
                return
            }
        }
        // Pass to parent handler if autocomplete didn't consume it
        parentOnKeyDown?.(e)
    }

    // Close dropdown on outside click
    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsFocused(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    return (
        <div ref={wrapperRef} className={cn("relative", className)}>
            <Input
                value={value}
                onChange={(e) => {
                    onChange(e.target.value)
                    setHighlightIndex(-1)
                }}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={inputClassName}
            />
            {showDropdown && (
                <div className="absolute z-[999] top-full left-0 right-0 mt-1 bg-white/90 backdrop-blur-xl border border-white/60 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {filtered.map((item, i) => (
                        <button
                            key={item}
                            type="button"
                            className={cn(
                                "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-indigo-50",
                                i === highlightIndex && "bg-indigo-50 text-indigo-700"
                            )}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                handleSelect(item)
                            }}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
