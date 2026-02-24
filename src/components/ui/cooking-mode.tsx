"use client"

import { Meal, Ingredient } from "@/types"
import { Button } from "@/components/ui/button"
import { Clock, Users, X, Flame, ChefHat, Wheat, Beef, Droplets, Zap } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"

interface CookingModeProps {
    recipe: Meal
    servings: number
    scaledIngredients: Ingredient[]
    onClose: () => void
}

const DIFFICULTY_ICON: Record<string, string> = {
    Enkel: "🟢",
    Middels: "🟡",
    Avansert: "🔴",
}

export function CookingMode({ recipe, servings, scaledIngredients, onClose }: CookingModeProps) {
    const hasImage = !!recipe.imageUrl && recipe.imageUrl.trim() !== ""

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
        >
            {/* Hero */}
            <div className={`relative w-full rounded-3xl overflow-hidden shadow-xl ${hasImage ? "h-72 md:h-96" : "h-48"} bg-gradient-to-br from-indigo-100 via-purple-50 to-indigo-50`}>
                {hasImage && (
                    <Image
                        src={recipe.imageUrl!}
                        alt={recipe.name}
                        fill
                        className="object-cover"
                        priority
                        unoptimized
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />

                {/* Layout inside hero */}
                <div className="absolute inset-0 p-8 flex flex-col justify-between">
                    {/* Top row — close button top-right */}
                    <div className="flex justify-end relative z-10">
                        <Button
                            onClick={onClose}
                            variant="outline"
                            size="sm"
                            className={hasImage
                                ? "bg-white/20 backdrop-blur-md border-white/20 text-white hover:bg-white/30 rounded-2xl"
                                : "bg-white/80 backdrop-blur-md border-white shadow-md text-gray-700 hover:bg-white rounded-2xl"
                            }
                        >
                            <X className="w-4 h-4 mr-2" /> Avslutt
                        </Button>
                    </div>

                    {/* Bottom — title + pills */}
                    <div className="relative z-10">
                        <h1 className={`text-4xl md:text-5xl font-bold drop-shadow-lg leading-tight mb-4 ${hasImage ? "text-white" : "text-gray-900"}`}>
                            {recipe.name}
                        </h1>
                        <div className="flex flex-wrap gap-3 font-medium">
                            {recipe.prepTime && (
                                <span className={`flex items-center gap-2 backdrop-blur-sm px-3 py-1.5 rounded-full ${hasImage ? "bg-black/20 text-white/90" : "bg-white/80 text-gray-700 shadow-sm"}`}>
                                    <Clock className="w-4 h-4" /> {recipe.prepTime} min
                                </span>
                            )}
                            <span className={`flex items-center gap-2 backdrop-blur-sm px-3 py-1.5 rounded-full ${hasImage ? "bg-black/20 text-white/90" : "bg-white/80 text-gray-700 shadow-sm"}`}>
                                <Users className="w-4 h-4" /> {servings} porsjoner
                            </span>
                            {recipe.difficulty && (
                                <span className={`flex items-center gap-2 backdrop-blur-sm px-3 py-1.5 rounded-full ${hasImage ? "bg-black/20 text-white/90" : "bg-white/80 text-gray-700 shadow-sm"}`}>
                                    {DIFFICULTY_ICON[recipe.difficulty] ?? "⚪"} {recipe.difficulty}
                                </span>
                            )}
                            {recipe.tags?.map(tag => (
                                <span key={tag} className={`backdrop-blur-sm px-3 py-1.5 rounded-full ${hasImage ? "bg-black/20 text-white/90" : "bg-white/80 text-gray-700 shadow-sm"}`}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Nutrition row (if available) */}
            {recipe.nutrition && (
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: "Kalorier", value: recipe.nutrition.calories, unit: "kcal", icon: Zap,     color: "text-amber-500",  bg: "bg-amber-50/60  border-amber-100/60"  },
                        { label: "Protein",  value: recipe.nutrition.protein,  unit: "g",    icon: Beef,    color: "text-rose-500",   bg: "bg-rose-50/60   border-rose-100/60"   },
                        { label: "Karbo",    value: recipe.nutrition.carbs,    unit: "g",    icon: Wheat,   color: "text-orange-500", bg: "bg-orange-50/60 border-orange-100/60" },
                        { label: "Fett",     value: recipe.nutrition.fat,      unit: "g",    icon: Droplets,color: "text-sky-500",    bg: "bg-sky-50/60    border-sky-100/60"    },
                    ].map(n => (
                        <div key={n.label} className={`flex flex-col items-center gap-1 p-3 rounded-2xl border backdrop-blur-md bg-white/60 border-white/70 shadow-sm`}>
                            <n.icon className={`w-4 h-4 ${n.color}`} />
                            <div className="text-lg font-black text-gray-900 leading-none">{n.value ?? "–"}</div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">{n.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Two separate cards side by side */}
            <div className="grid md:grid-cols-2 gap-6">

                {/* ── Ingredients card ── */}
                <div className="bg-white/60 backdrop-blur-md border border-white/70 rounded-3xl shadow-lg p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                            <ChefHat className="w-4 h-4 text-indigo-500" />
                        </div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">
                            Ingredienser
                        </h2>
                        <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {scaledIngredients.length}
                        </span>
                    </div>
                    <ul>
                        {scaledIngredients.map((ing, i) => (
                            <li key={i} className={`flex items-center justify-between gap-4 ${i === 0 ? "pb-3" : i === scaledIngredients.length - 1 ? "pt-3" : "py-3"} ${i !== scaledIngredients.length - 1 ? "border-b border-gray-100" : ""}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-5 h-5 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    </div>
                                    <span className="font-semibold text-gray-800 text-sm">{ing.name}</span>
                                </div>
                                {(ing.amount != null || ing.unit) && (
                                    <span className="text-xs font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl shrink-0 tabular-nums">
                                        {ing.amount != null ? ing.amount : ""}{ing.unit ? ` ${ing.unit}` : ""}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ── Instructions card ── */}
                <div className="bg-white/60 backdrop-blur-md border border-white/70 rounded-3xl shadow-lg p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                            <Flame className="w-4 h-4 text-indigo-500" />
                        </div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">
                            Fremgangsmåte
                        </h2>
                        <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {recipe.instructions?.length ?? 0} steg
                        </span>
                    </div>
                    <ol className="relative space-y-6">
                        {/* Vertical connecting line */}
                        <div className="absolute left-[13px] top-3.5 bottom-3.5 w-px bg-indigo-100" />
                        {recipe.instructions?.map((step, i) => (
                            <li key={i} className="flex gap-4 relative py-0">
                                <div className="shrink-0 w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-xs shadow-sm shadow-indigo-200 z-10">
                                    {i + 1}
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed pt-0.5">
                                    {step}
                                </p>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </motion.div>
    )
}
