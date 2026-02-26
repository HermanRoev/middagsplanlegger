import * as React from "react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { Clock, Users, ArrowRight, ChefHat, CalendarIcon, Star, RefreshCw, X } from "lucide-react"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

// Stat Card
export function StatCard({
    label,
    value,
    icon: Icon,
    colorClass,
    bgClass
}: {
    label: string,
    value: string | number,
    icon: React.ElementType,
    colorClass: string,
    bgClass: string
}) {
    return (
        <Card className="p-3 sm:p-6 flex items-center gap-3 sm:flex-col sm:items-center sm:text-center border-white/50">
            <div className={cn("p-2 sm:p-3 rounded-xl sm:rounded-2xl sm:mb-3 border border-white/50 shrink-0", bgClass)}>
                <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", colorClass)} />
            </div>
            <div className="flex flex-col sm:items-center">
                <div className="text-xl sm:text-3xl font-black text-gray-900 leading-tight">{value}</div>
                <div className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] sm:mt-2">{label}</div>
            </div>
        </Card>
    )
}

// Unified Context Interface for generic Meal Cards
export interface MealCardContext {
    id: string; // The planned meal id OR recipe id
    mealId?: string; // If this is a planned meal, this points to the recipe
    name: string;
    imageUrl?: string | null;
    prepTime?: number;
    servings?: number;
    notes?: string;
    rating?: number;
    dateLabel?: string; // E.g., "Monday", "Leftovers"
    isExpired?: boolean;
    isToday?: boolean;
}

export function HeroMealCard({
    meal,
    emptyState
}: {
    meal?: MealCardContext,
    emptyState?: React.ReactNode
}) {
    return (
        <Card className="h-full border-white/50 shadow-lg overflow-hidden flex flex-col md:flex-row">
            {/* Image Section */}
            <div className="md:w-1/2 relative min-h-[300px] bg-white/30 backdrop-blur-sm border-r border-white/30">
                {meal?.imageUrl && meal.imageUrl.trim() !== "" ? (
                    <Image
                        src={meal.imageUrl}
                        alt={meal.name}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50/80">
                        <ChefHat className="w-20 h-20 text-indigo-200" />
                    </div>
                )}
                {meal?.isToday && (
                    <div className="absolute top-6 left-6">
                        <div className="bg-indigo-600 text-white px-4 py-2 rounded-2xl font-bold text-sm shadow-lg">
                            Dagens middag
                        </div>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="md:w-1/2 p-10 flex flex-col justify-between">
                {meal ? (
                    <>
                        <div>
                            <h3 className="text-4xl font-black text-gray-900 leading-tight mb-4 tracking-tight">
                                {meal.name}
                            </h3>
                            <div className="flex gap-6 mb-8 text-indigo-900 font-bold text-[10px] uppercase tracking-[0.2em]">
                                <span className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-500" /> {meal.prepTime || 30} min
                                </span>
                                {meal.servings && (
                                    <span className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-indigo-500" /> {meal.servings} porsjoner
                                    </span>
                                )}
                            </div>
                            {meal.notes && (
                                <div className="bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-white/60 italic text-gray-700 mb-6 shadow-sm">
                                    &quot;{meal.notes}&quot;
                                </div>
                            )}
                        </div>
                        <Button asChild size="xl" shape="pill" className="w-full text-[14px] uppercase tracking-widest font-black shadow-xl shadow-indigo-200" iconRight={<ArrowRight className="w-6 h-6" />}>
                            <Link href={`/dashboard/recipes/view?id=${meal.mealId || meal.id}${meal.mealId ? `&plannedId=${meal.id}` : ''}`}>
                                Start koking
                            </Link>
                        </Button>
                    </>
                ) : emptyState}
            </div>
        </Card>
    )
}

export function ListItemCard({
    href,
    title,
    subtitleLabel,
    subtitleValue,
    icon: SubtitleIcon,
    imageUrl,
    imageFallbackIcon: FallbackIcon = ChefHat
}: {
    href: string,
    title: string,
    subtitleLabel: string,
    subtitleValue?: string | number,
    icon?: React.ElementType,
    imageUrl?: string | null,
    imageFallbackIcon?: React.ElementType
}) {
    return (
        <Link href={href}>
            <div className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                <div className="w-14 h-14 rounded-xl overflow-hidden relative bg-gray-100 flex-shrink-0">
                    {imageUrl && imageUrl.trim() !== "" ? (
                        <Image src={imageUrl} alt={title} fill className="object-cover" unoptimized />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                            <FallbackIcon className="w-6 h-6 text-indigo-200" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    {subtitleLabel && subtitleLabel !== title && (
                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest truncate">
                            {subtitleLabel}
                        </div>
                    )}
                    <div className="font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {title}
                    </div>
                    {subtitleValue && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 font-bold mt-0.5">
                            {SubtitleIcon && <SubtitleIcon className="w-3 h-3 fill-amber-600" />}
                            {subtitleValue}
                        </div>
                    )}
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </div>
        </Link>
    )
}

// Wraps ListItems inside a themed Sidebar Card
export function SidebarListCard({
    title,
    icon: TitleIcon,
    children,
    footerAction,
    footerHref
}: {
    title: string,
    icon: React.ElementType,
    children: React.ReactNode,
    footerAction?: string,
    footerHref?: string
}) {
    return (
        <Card className="shadow-lg border-white/50">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <TitleIcon className="w-5 h-5 text-indigo-600" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                <div className="space-y-4">
                    {children}
                    {footerAction && footerHref && (
                        <Button asChild variant="outline" className="w-full rounded-xl font-semibold text-gray-500 border-white/60 bg-white/30 hover:bg-white/60 hover:text-gray-800 hover:border-white/80 backdrop-blur-sm transition-all mt-2">
                            <Link href={footerHref}>{footerAction}</Link>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// Interactive Weekly Planner Card
export function PlannerMealCard({
    meal,
    isToday,
    isExpired,
    onClick,
    onReplace,
    onRemove,
    planDateKey
}: {
    meal: MealCardContext,
    isToday?: boolean,
    isExpired?: boolean,
    onClick: () => void,
    onReplace: () => void,
    onRemove: () => void,
    planDateKey: string
}) {
    const isPlaceholder = meal.mealId === 'suggestion-placeholder' || meal.mealId === 'leftover-placeholder';
    const isClickable = !isPlaceholder && !isExpired;

    return (
        <div
            className={cn(
                "group relative flex-1 rounded-2xl border p-0 transition-all flex flex-col print:shadow-none print:border-0 print:p-0 bg-white/30 backdrop-blur-sm border-white/40",
                isClickable && "cursor-pointer hover:bg-white/50 hover:shadow-sm",
            )}
            onClick={isClickable ? onClick : undefined}
        >
            <div className="flex-1 flex flex-col">
                {/* Meal Image */}
                <div className="relative w-full h-32 rounded-t-2xl overflow-hidden mb-4 bg-gray-100">
                    {meal.imageUrl && meal.imageUrl.trim() !== "" ? (
                        <Image
                            src={meal.imageUrl}
                            alt={meal.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            unoptimized
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-50/50">
                            {meal.mealId === 'leftover-placeholder' ? (
                                <Star className="w-10 h-10 text-amber-200" />
                            ) : (
                                <ChefHat className="w-10 h-10 text-indigo-100" />
                            )}
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="px-5 pb-2">
                    <div className="flex justify-between items-start mb-2 pr-6">
                        <h3 className="font-bold text-gray-900 text-xl leading-tight group-hover:text-indigo-700 transition-colors print:text-lg">
                            {meal.name}
                        </h3>
                    </div>

                    {meal.notes && (
                        <div className="text-sm text-gray-600 italic line-clamp-2 mb-4 bg-white p-3 rounded-xl border border-gray-100 print:border-0 print:p-0 print:text-gray-600">
                            &quot;{meal.notes}&quot;
                        </div>
                    )}
                </div>
            </div>

            {/* Remove button — top-left, hover-only */}
            {!isExpired && (
                <div
                    className="absolute top-3 left-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity print:hidden z-10"
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                >
                    <div className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-gray-100 text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors cursor-pointer" title="Fjern fra plan">
                        <X className="w-4 h-4" />
                    </div>
                </div>
            )}

            {/* Replace button — top-right, hover-only */}
            {!isExpired && (
                <div
                    className="absolute top-3 right-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity print:hidden z-10"
                    onClick={(e) => { e.stopPropagation(); onReplace(); }}
                >
                    <div className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-400 transition-colors cursor-pointer" title="Bytt ut middag">
                        <RefreshCw className="w-4 h-4" />
                    </div>
                </div>
            )}

            <div className="px-5 pb-5 mt-auto flex items-center gap-4 text-xs font-bold text-gray-500 print:hidden">
                {meal.servings && (
                    <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
                        <Users className="w-3.5 h-3.5 text-indigo-500" /> {meal.servings} porsjoner
                    </span>
                )}
                {meal.prepTime && (
                    <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" /> {meal.prepTime} min
                    </span>
                )}
            </div>
        </div>
    )
}
