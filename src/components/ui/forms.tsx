import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UnitSelect } from "@/components/ui/unit-select"
import { Trash, X } from "lucide-react"
import { Ingredient } from "@/types"

// ─── FormLabel ─────────────────────────────────────────────────────────────────

export function FormLabel({
    children,
    required,
    className
}: {
    children: React.ReactNode
    required?: boolean
    className?: string
}) {
    return (
        <label className={cn("text-sm font-medium text-gray-700", className)}>
            {children}
            {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
    )
}

// ─── IngredientRow ──────────────────────────────────────────────────────────────

export function IngredientRow({
    ingredient,
    index,
    onChange,
    onRemove,
    compact = false
}: {
    ingredient: Ingredient
    index: number
    onChange: (index: number, field: keyof Ingredient, value: string | number) => void
    onRemove: (index: number) => void
    /** Compact mode: smaller inputs, used in recipe detail edit mode */
    compact?: boolean
}) {
    if (compact) {
        return (
            <div className="flex gap-2 w-full items-center">
                <Input
                    value={ingredient.name}
                    onChange={(e) => onChange(index, 'name', e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Navn"
                />
                <div className="flex gap-1">
                    <Input
                        type="number"
                        value={ingredient.amount || ''}
                        onChange={(e) => onChange(index, 'amount', Number(e.target.value))}
                        className="h-8 w-14 text-xs px-1 text-center"
                        placeholder="#"
                    />
                    <UnitSelect
                        value={ingredient.unit}
                        onChange={(val) => onChange(index, 'unit', val)}
                        className="h-8 w-14 text-xs"
                    />
                </div>
                <button
                    onClick={() => onRemove(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        )
    }

    return (
        <div className="flex gap-2 items-center group">
            <Input
                placeholder="Navn"
                className="flex-1"
                value={ingredient.name}
                onChange={(e) => onChange(index, 'name', e.target.value)}
            />
            <Input
                type="number"
                placeholder="Ant."
                className="w-20 text-center"
                value={ingredient.amount || ''}
                onChange={(e) => onChange(index, 'amount', Number(e.target.value))}
            />
            <UnitSelect
                value={ingredient.unit}
                onChange={(val) => onChange(index, 'unit', val)}
                className="w-24"
            />
            <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
            >
                <Trash className="w-4 h-4" />
            </Button>
        </div>
    )
}

// ─── StepRow ────────────────────────────────────────────────────────────────────

export function StepRow({
    step,
    index,
    onChange,
    onRemove
}: {
    step: string
    index: number
    onChange: (index: number, value: string) => void
    onRemove: (index: number) => void
}) {
    return (
        <div className="flex gap-4 group">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm mt-1">
                {index + 1}
            </div>
            <textarea
                className="flex-1 min-h-[80px] p-3 rounded-md border border-input bg-gray-50/50 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                value={step}
                placeholder={`Steg ${index + 1} detaljer...`}
                onChange={(e) => onChange(index, e.target.value)}
            />
            <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 mt-2"
            >
                <Trash className="w-4 h-4" />
            </Button>
        </div>
    )
}
