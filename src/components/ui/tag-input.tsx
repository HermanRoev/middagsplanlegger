"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { AutocompleteInput } from "./autocomplete-input"

interface TagInputProps {
    tags: string[]
    allTags: string[]
    onChange: (tags: string[]) => void
    className?: string
}

export function TagInput({ tags, allTags, onChange, className }: TagInputProps) {
    const [inputValue, setInputValue] = React.useState("")

    const availableTags = React.useMemo(
        () => allTags.filter(t => !tags.includes(t)),
        [allTags, tags]
    )

    const handleAdd = (value: string) => {
        const trimmed = value.trim()
        if (!trimmed || tags.includes(trimmed)) return
        onChange([...tags, trimmed])
        setInputValue("")
    }

    const handleRemove = (tag: string) => {
        onChange(tags.filter(t => t !== tag))
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault()
            handleAdd(inputValue)
        } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
            onChange(tags.slice(0, -1))
        }
    }

    return (
        <div className={cn("space-y-2", className)}>
            {/* Selected tags as chips */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100"
                        >
                            {tag}
                            <button
                                type="button"
                                onClick={() => handleRemove(tag)}
                                className="text-indigo-400 hover:text-indigo-700 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Autocomplete input to add new */}
            <AutocompleteInput
                suggestions={availableTags}
                value={inputValue}
                onChange={(val) => {
                    // If the user selected from dropdown, add it immediately
                    if (allTags.includes(val)) {
                        handleAdd(val)
                    } else {
                        setInputValue(val)
                    }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Skriv for å søke eller legg til ny tag..."
                inputClassName="h-9 text-sm"
            />

            <p className="text-[10px] text-gray-400">Trykk Enter for å legge til en ny tag</p>
        </div>
    )
}
