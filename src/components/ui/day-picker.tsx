"use client"

import { useState } from "react"
import { format, addDays, isSameDay } from "date-fns"
import { nb } from "date-fns/locale"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DayPickerProps {
    value: string // yyyy-MM-dd or ""
    onChange: (date: string) => void
    maxDays?: number
    placeholder?: string
    className?: string
}

function getDayLabel(date: Date): string {
    const today = new Date()
    if (isSameDay(date, today)) return "I dag"
    if (isSameDay(date, addDays(today, 1))) return "I morgen"
    return ""
}

export function DayPicker({
    value,
    onChange,
    maxDays = 10,
    placeholder = "Hvilken dag?",
    className
}: DayPickerProps) {
    const [open, setOpen] = useState(false)
    const today = new Date()

    const days = Array.from({ length: maxDays }, (_, i) => {
        const date = addDays(today, i)
        return {
            date,
            dateStr: format(date, "yyyy-MM-dd"),
            // "Mandag 24. februar"
            fullLabel: format(date, "EEEE d. MMMM", { locale: nb }),
            shortLabel: getDayLabel(date),
            isSelected: value === format(date, "yyyy-MM-dd"),
        }
    })

    const selectedDay = days.find(d => d.isSelected)
    const displayText = value
        ? selectedDay?.shortLabel || (selectedDay ? format(selectedDay.date, "EEEE d. MMM", { locale: nb }) : placeholder)
        : placeholder

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="glass"
                        className={cn(
                            "h-11 px-4 rounded-xl gap-2 transition-all",
                            value
                                ? "text-indigo-600 border-indigo-200 bg-indigo-50/50"
                                : "text-gray-500"
                        )}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        <span className="font-semibold text-sm capitalize">{displayText}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[calc(100vw-2rem)] sm:w-80 p-4 bg-white/80 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-2xl"
                    align="start"
                    sideOffset={8}
                >
                    <div className="flex flex-col gap-2">
                        {days.map((day) => (
                            <button
                                key={day.dateStr}
                                type="button"
                                onClick={() => {
                                    onChange(day.dateStr)
                                    setOpen(false)
                                }}
                                className={cn(
                                    "w-full py-3 px-4 rounded-full text-sm font-semibold text-center transition-all",
                                    "border backdrop-blur-sm active:scale-[0.97]",
                                    day.isSelected
                                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-indigo-400 shadow-lg shadow-indigo-200/50"
                                        : day.shortLabel === "I dag"
                                            ? "bg-indigo-50/80 text-indigo-700 border-indigo-200/60 hover:bg-indigo-100/80"
                                            : day.shortLabel === "I morgen"
                                                ? "bg-purple-50/80 text-purple-700 border-purple-200/60 hover:bg-purple-100/80"
                                                : "bg-white/60 text-gray-700 border-gray-200/60 hover:bg-white/90 hover:border-gray-300/60"
                                )}
                            >
                                <span className="capitalize">
                                    {day.shortLabel
                                        ? `${day.shortLabel} — ${day.fullLabel}`
                                        : day.fullLabel
                                    }
                                </span>
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            {value && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onChange("")}
                    className="h-9 w-9 text-red-400 hover:bg-red-50 rounded-xl"
                >
                    <X className="w-4 h-4" />
                </Button>
            )}
        </div>
    )
}
