"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Clock, Users, ChefHat, PackageCheck, Star } from "lucide-react"
import { formatDistanceToNow, parseISO } from "date-fns"
import { nb } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Meal } from "@/types"

interface RecipeCardProps {
    recipe: Meal
    /** Pantry coverage percentage (0–100) */
    pantryCoverage?: number
    /** Whether 50%+ of ingredients are in the pantry */
    canCook?: boolean
    /** If set, renders a "Velg oppskrift" button instead of "Se detaljer" */
    onPlan?: (recipe: Meal) => void
}

export function RecipeCard({ recipe, pantryCoverage = 0, canCook = false, onPlan }: RecipeCardProps) {
    return (
        <Card className="h-full flex flex-col overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 shadow-lg border-white/50">
            {/* Image */}
            <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                {recipe.imageUrl && recipe.imageUrl.trim() !== "" ? (
                    <Image
                        src={recipe.imageUrl}
                        alt={recipe.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50/50">
                        <ChefHat className="w-12 h-12 text-indigo-100" />
                    </div>
                )}

                {/* Badges */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                    {pantryCoverage > 0 ? (
                        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm border border-white/50">
                            <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{pantryCoverage}% på lager</span>
                        </div>
                    ) : <div />}
                    {canCook && (
                        <div className="bg-emerald-500 text-white p-1.5 rounded-xl shadow-lg">
                            <PackageCheck className="w-4 h-4" />
                        </div>
                    )}
                </div>

                {/* Hover overlay with meta */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-4 left-4 right-4 text-white z-10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recipe.prepTime || 30}m</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {recipe.servings || 4}p</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <CardContent className="p-6 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="font-black text-xl leading-tight text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                        {recipe.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 font-bold uppercase tracking-wider mt-4">
                        {recipe.rating ? (
                            <div className="flex items-center gap-1 text-amber-500">
                                <Star className="w-4 h-4 fill-amber-500" /> {recipe.rating.toFixed(1)}
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-gray-400">
                                <Star className="w-4 h-4" /> Ny
                            </div>
                        )}
                        {recipe.lastCooked && (
                            <div className="text-[10px] text-gray-400 ml-auto whitespace-nowrap">
                                Laget {formatDistanceToNow(parseISO(recipe.lastCooked), { addSuffix: true, locale: nb })}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>

            {/* Action */}
            <div className="px-6 pb-6 mt-auto">
                {onPlan ? (
                    <Button
                        className="w-full h-12 rounded-xl font-bold text-lg shadow-lg shadow-indigo-100"
                        onClick={() => onPlan(recipe)}
                    >
                        Velg oppskrift
                    </Button>
                ) : (
                    <Button asChild variant="outline" className="w-full h-12 rounded-xl font-semibold text-gray-500 border-white/60 bg-white/30 hover:bg-white/60 hover:text-gray-800 hover:border-white/80 backdrop-blur-sm transition-all">
                        <Link href={`/dashboard/recipes/${recipe.id}`}>Se detaljer</Link>
                    </Button>
                )}
            </div>
        </Card>
    )
}
