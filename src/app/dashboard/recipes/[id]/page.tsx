"use client"

import { useState, useEffect } from "react"
import { doc, onSnapshot, deleteDoc, updateDoc, writeBatch, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Meal, PlannedMeal, Ingredient } from "@/types"
import { firestoreMealSchema, firestorePlannedMealSchema } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Clock, Users, Trash2, Edit, Save, ArrowLeft, ArrowRightLeft, Plus, Utensils, Check, Minus, Smartphone, Star, ChefHat } from "lucide-react"
import { PageContainer } from "@/components/layout/PageLayout"
import { IngredientRow } from "@/components/ui/forms"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import toast from "react-hot-toast"
import Link from "next/link"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { incrementUserStat } from "@/lib/stats"
import { CookingMode } from "@/components/ui/cooking-mode"

export default function RecipeDetailsPage() {
    const { id } = useParams()
    const searchParams = useSearchParams()
    const plannedId = searchParams.get('plannedId')
    const router = useRouter()
    const { user } = useAuth()

    const [recipe, setRecipe] = useState<Meal | null>(null)
    const [plannedMeal, setPlannedMeal] = useState<PlannedMeal | null>(null)

    // Display State
    const [currentServings, setCurrentServings] = useState(4)
    const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)
    const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())

    // Edit State for Planned Meal
    const [editNotes, setEditNotes] = useState("")
    const [editServings, setEditServings] = useState(4)
    const [editIngredients, setEditIngredients] = useState<Ingredient[]>([])
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isCooked, setIsCooked] = useState(false)

    // Dialog States
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showRemovePlanDialog, setShowRemovePlanDialog] = useState(false)

    // Cooking Mode
    const [cookingMode, setCookingMode] = useState(false)

    useEffect(() => {
        if (!id || id === 'leftover-placeholder') return
        const unsubscribe = onSnapshot(doc(db, "meals", id as string), (doc) => {
            if (doc.exists()) {
                const rawData = { id: doc.id, ...doc.data() };
                const result = firestoreMealSchema.safeParse(rawData);
                if (result.success) {
                    setRecipe(result.data as Meal);
                    if (!plannedId) setCurrentServings(result.data.servings || 4);
                } else {
                    toast.error("Failed to load recipe data.");
                    console.warn("Recipe validation error:", result.error.flatten(), "Data:", rawData);
                    router.push("/dashboard/recipes");
                }
            } else {
                toast.error("Recipe not found");
                router.push("/dashboard/recipes");
            }
        })
        return () => unsubscribe()
    }, [id, router, plannedId])

    useEffect(() => {
        if (!plannedId) return
        const unsubscribe = onSnapshot(doc(db, "plannedMeals", plannedId), (doc) => {
            if (doc.exists()) {
                const rawData = { id: doc.id, ...doc.data() };
                const result = firestorePlannedMealSchema.safeParse(rawData);
                if (result.success) {
                    const data = result.data as PlannedMeal;
                    setPlannedMeal(data);
                    setEditNotes(data.notes || "");
                    setEditServings(data.plannedServings || 4);
                    setEditIngredients(data.ingredients || []);
                    setIsCooked(data.isCooked || false);
                    setCurrentServings(data.plannedServings || 4);
                } else {
                    console.warn("Planned meal validation error:", result.error.flatten(), "Data:", rawData);
                    setPlannedMeal(null);
                }
            } else {
                setPlannedMeal(null)
            }
        })
        return () => unsubscribe()
    }, [plannedId])

    useEffect(() => {
        return () => {
            if (wakeLock) wakeLock.release()
        }
    }, [wakeLock])

    const toggleWakeLock = async () => {
        if (wakeLock) {
            await wakeLock.release()
            setWakeLock(null)
            toast("Kokemodus deaktivert", { icon: "🌙" })
        } else {
            try {
                const sentinel = await navigator.wakeLock.request('screen')
                setWakeLock(sentinel)
                toast("Kokemodus aktivert! Skjermen holdes på.", { icon: "☀️" })
            } catch (err) {
                console.error(err)
                toast.error("Wake Lock støttes ikke")
            }
        }
    }

    const toggleIngredientCheck = (index: number) => {
        const next = new Set(checkedIngredients)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        setCheckedIngredients(next)
    }

    const handleEnterEditMode = () => {
        setIsEditing(true)
        if (editIngredients.length === 0 && recipe?.ingredients) {
            setEditIngredients(recipe.ingredients)
        }
    }

    const handleDelete = async () => {
        try {
            const batch = writeBatch(db);

            // 1. Delete the recipe document itself
            batch.delete(doc(db, "meals", id as string));

            // 2. Find and delete all planned meals referencing this recipe
            const plannedMealsRef = collection(db, "plannedMeals");
            const q = query(plannedMealsRef, where("mealId", "==", id as string));
            const snapshot = await getDocs(q);

            snapshot.forEach((plannedDoc) => {
                batch.delete(plannedDoc.ref);
            });

            // 3. Commit the batch transaction
            await batch.commit();

            toast.success("Oppskrift og tilhørende planer slettet");
            router.push("/dashboard/recipes");
        } catch (error) {
            console.error(error);
            toast.error("Kunne ikke slette oppskriften");
        }
    }

    const handleRemovePlanned = async () => {
        if (!plannedId) return
        try {
            await deleteDoc(doc(db, "plannedMeals", plannedId))
            toast.success("Removed from plan")
            router.push("/dashboard/planner")
        } catch {
            toast.error("Failed to remove")
        }
    }

    const handleSavePlanChanges = async () => {
        if (!plannedId) return
        setLoading(true)
        try {
            await updateDoc(doc(db, "plannedMeals", plannedId), {
                notes: editNotes,
                plannedServings: editServings,
                ingredients: editIngredients,
                updatedAt: new Date().toISOString()
            })
            toast.success("Plan updated")
            setIsEditing(false)
        } catch (e) {
            console.error(e)
            toast.error("Failed to update plan")
        } finally {
            setLoading(false)
        }
    }

    const handleMarkCooked = async () => {
        if (!plannedMeal || !recipe) return

        try {
            const newCookedState = !isCooked
            await updateDoc(doc(db, "plannedMeals", plannedMeal.id!), {
                isCooked: newCookedState
            })

            // Update lastCooked on the original recipe only when marking AS cooked
            if (newCookedState) {
                await updateDoc(doc(db, "meals", recipe.id), {
                    lastCooked: new Date().toISOString()
                })
                if (user) {
                    await incrementUserStat(user.uid, 'mealsCooked', 1)
                }
            }

            toast.success(newCookedState ? "Meal marked as cooked!" : "Marked as uncooked")

            if (!newCookedState) {
                toast("Ingredients subtracted from cupboard (Simulation)", { icon: '📦' })
            }

        } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
            toast.error("Failed to update status")
        }
    }

    const handleRate = async (ratingScore: number) => {
        if (!recipe || !user) {
            toast.error("Du må være logget inn for å vurdere")
            return
        }

        try {
            const currentRatings = recipe.ratings || {};
            const newRatings = { ...currentRatings, [user.uid]: ratingScore };

            // Calculate new average
            const total = Object.values(newRatings).reduce((sum, val) => sum + val, 0);
            const average = Number((total / Object.keys(newRatings).length).toFixed(1));

            await updateDoc(doc(db, "meals", recipe.id), {
                ratings: newRatings,
                rating: average
            })
            toast.success("Vurdering lagret")
        } catch {
            toast.error("Kunne ikke lagre vurdering")
        }
    }

    const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
        const newIngredients = [...editIngredients]
        newIngredients[index] = { ...newIngredients[index], [field]: value } as Ingredient
        setEditIngredients(newIngredients)
    }

    const handleRemoveIngredient = (index: number) => {
        setEditIngredients(editIngredients.filter((_, i) => i !== index))
    }

    const handleAddIngredient = () => {
        setEditIngredients([...editIngredients, { name: '', amount: 0, unit: 'stk' }])
    }


    const isLeftover = id === 'leftover-placeholder'
    const isPlannedMode = !!plannedMeal

    if (!recipe && !isLeftover) return <div className="p-8 text-center">Laster oppskrift...</div>
    if (isLeftover && !plannedMeal) return <div className="p-8 text-center">Laster resterdata...</div>

    if (isLeftover && plannedMeal) {
        return (
            <PageContainer className="max-w-2xl py-12">
                <Card className="shadow-xl border-amber-100 overflow-hidden">
                    <div className="bg-amber-500 h-3" />
                    <CardHeader className="text-center pb-2">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Utensils className="w-10 h-10 text-amber-600" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-gray-900">Rester</CardTitle>
                        <CardDescription className="text-lg">
                            Planlagt for {format(new Date(plannedMeal.date), "EEEE d. MMMM", { locale: nb })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 italic text-center text-gray-700 text-lg">
                            &quot;{plannedMeal.notes || "Spis opp tidligere måltider!"}&quot;
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                variant="destructive"
                                size="lg"
                                className="rounded-xl font-bold py-6"
                                onClick={handleRemovePlanned}
                            >
                                <Trash2 className="w-5 h-5 mr-2" /> Fjern fra plan
                            </Button>
                            <Button
                                variant="ghost"
                                size="lg"
                                className="rounded-xl"
                                onClick={() => router.back()}
                            >
                                Tilbake
                            </Button>

                        </div>
                    </CardContent>
                </Card>
            </PageContainer>
        )
    }

    // Type guard assertion since leftover returns early
    if (!recipe) return null;

    // Ingredient Scaling Logic
    const baseServings = isPlannedMode ? (plannedMeal?.plannedServings || 4) : (recipe.servings || 4)
    const scaleFactor = currentServings / baseServings

    const baseIngredients = isPlannedMode ? (plannedMeal?.ingredients || recipe.ingredients) : recipe.ingredients

    const displayedIngredients = isEditing
        ? editIngredients
        : baseIngredients?.map(ing => ({
            ...ing,
            amount: ing.amount ? Number((ing.amount * scaleFactor).toFixed(1)) : 0
        }))

    const displayedNotes = isPlannedMode ? (isEditing ? editNotes : plannedMeal?.notes) : null

    // Helper to render rich text (basic markdown: **bold**)
    const renderRichText = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>
            }
            return part
        })
    }

    const renderRatingUI = () => {
        const userRating = user && recipe.ratings ? recipe.ratings[user.uid] : 0;
        const displayRating = userRating > 0 ? userRating : (recipe.rating || 0);

        return (
            <div className="flex flex-col items-end">
                <div className="flex gap-1 bg-black/20 backdrop-blur-sm p-2 rounded-full">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => handleRate(star)} className="focus:outline-none transition-transform hover:scale-110">
                            <Star className={`w-5 h-5 ${displayRating >= star ? 'text-yellow-400 fill-yellow-400' : (displayRating >= star - 0.5 ? 'text-yellow-400 fill-yellow-400 opacity-50' : 'text-gray-300')}`} />
                        </button>
                    ))}
                </div>
                {userRating > 0 && recipe.rating && (
                    <div className="text-white/80 text-xs mt-1 font-medium bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        Snitt: {recipe.rating.toFixed(1)} <Star className="w-3 h-3 inline pb-[1px]" />
                    </div>
                )}
            </div>
        )
    }

    return (
        <PageContainer className="space-y-8 pb-10">
        <AnimatePresence mode="wait">
        {cookingMode ? (
            <CookingMode
                key="cooking"
                recipe={recipe}
                servings={currentServings}
                scaledIngredients={displayedIngredients ?? []}
                onClose={() => setCookingMode(false)}
            />
        ) : (<motion.div key="normal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
            {/* Header / Hero */}
            <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden shadow-xl group bg-gray-100">
                {recipe.imageUrl && recipe.imageUrl.trim() !== "" ? (
                    <>
                        <Image
                            src={recipe.imageUrl}
                            alt={recipe.name}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            priority
                            unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-indigo-50 flex items-center justify-center">
                        <span className="text-5xl font-black text-indigo-200/60 text-center px-8">{recipe.name}</span>
                    </div>
                )}
                <div className="absolute inset-0 p-8 flex flex-col justify-between">
                    <div className="flex justify-between items-start relative z-10">
                        <Button
                            variant="outline"
                            size="sm"
                            className={recipe.imageUrl && recipe.imageUrl.trim() !== ""
                                ? "bg-white/20 backdrop-blur-md border-white/20 text-white hover:bg-white/30"
                                : "bg-white/80 backdrop-blur-md border-white shadow-md text-gray-700 hover:bg-white"
                            }
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Tilbake
                        </Button>
                        {isPlannedMode && (
                            <div className="flex gap-2">
                                {isCooked && <span className="bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center gap-1"><Check className="w-3 h-3" /> Laget</span>}
                                <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg animate-in fade-in slide-in-from-top-4">
                                    Planlagt {format(new Date(plannedMeal.date), "d. MMMM", { locale: nb })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-end justify-between">
                            <div>
                                <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${recipe.imageUrl && recipe.imageUrl.trim() !== "" ? "text-white drop-shadow-lg" : "text-gray-900"}`}>{recipe.name}</h1>
                                <div className="flex flex-wrap gap-4 font-medium">
                                    <span className={`flex items-center gap-2 backdrop-blur-sm px-3 py-1.5 rounded-full ${recipe.imageUrl && recipe.imageUrl.trim() !== "" ? "bg-black/20 text-white/90" : "bg-white/80 text-gray-700 shadow-sm"}`}><Clock className="w-4 h-4" /> {recipe.prepTime} min</span>
                                    <span className={`flex items-center gap-2 backdrop-blur-sm px-3 py-1.5 rounded-full ${recipe.imageUrl && recipe.imageUrl.trim() !== "" ? "bg-black/20 text-white/90" : "bg-white/80 text-gray-700 shadow-sm"}`}><Users className="w-4 h-4" /> {currentServings} porsjoner</span>
                                </div>
                            </div>

                            {/* Rating Stars */}
                            {renderRatingUI()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Nutrition Badge (If available) */}
            {recipe.nutrition && (
                <div className="grid grid-cols-4 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Kalorier</div>
                        <div className="font-semibold text-gray-900">{recipe.nutrition.calories || '-'} kcal</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Protein</div>
                        <div className="font-semibold text-gray-900">{recipe.nutrition.protein || '-'} g</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Karbo</div>
                        <div className="font-semibold text-gray-900">{recipe.nutrition.carbs || '-'} g</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Fett</div>
                        <div className="font-semibold text-gray-900">{recipe.nutrition.fat || '-'} g</div>
                    </div>
                </div>
            )}

            {/* Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/60 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-white/70">
                <div className="flex gap-2 flex-wrap">
                    <Button
                        onClick={() => setCookingMode(true)}
                        variant="premium"
                        className="rounded-xl"
                        iconLeft={<ChefHat className="w-4 h-4" />}
                    >
                        Start matlaging
                    </Button>
                    {!isPlannedMode && (
                        <Link href={`/dashboard/recipes/${id}/edit`}>
                            <Button variant="glass" className="rounded-xl" iconLeft={<Edit className="w-4 h-4" />}>Rediger oppskrift</Button>
                        </Link>
                    )}
                    {isPlannedMode && !isEditing && (
                        <>
                            <Button
                                variant={isCooked ? "glass" : "premium"}
                                onClick={handleMarkCooked}
                                className={isCooked ? "rounded-xl text-emerald-600 border-emerald-200/60 bg-emerald-50/60 hover:bg-emerald-100/80" : "rounded-xl"}
                                iconLeft={isCooked ? undefined : <Utensils className="w-4 h-4" />}
                            >
                                {isCooked ? "Merk som ulaget" : "Merk som laget"}
                            </Button>
                            <Button variant="glass" className="rounded-xl" iconLeft={<Edit className="w-4 h-4" />} onClick={handleEnterEditMode}>Rediger plan</Button>
                        </>
                    )}
                    {isPlannedMode && isEditing && (
                        <>
                            <Button onClick={handleSavePlanChanges} disabled={loading} variant="premium" className="rounded-xl" iconLeft={<Save className="w-4 h-4" />}>Lagre endringer</Button>
                            <Button variant="glass" className="rounded-xl" onClick={() => setIsEditing(false)}>Avbryt</Button>
                        </>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="glass"
                        size="icon"
                        onClick={toggleWakeLock}
                        className={`rounded-xl ${wakeLock ? "text-amber-500 border-amber-200/60 bg-amber-50/60" : ""}`}
                        title={wakeLock ? "Skjermen holdes på" : "Hold skjermen på"}
                    >
                        <Smartphone className="w-5 h-5" />
                    </Button>

                    {isPlannedMode ? (
                        <>
                            <Dialog open={showRemovePlanDialog} onOpenChange={setShowRemovePlanDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="glass-destructive" className="rounded-xl" iconLeft={<Trash2 className="w-4 h-4" />}>Fjern fra plan</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Fjerne fra plan?</DialogTitle>
                                        <DialogDescription>Dette vil fjerne {recipe.name} fra {format(new Date(plannedMeal.date), "d. MMMM", { locale: nb })}.</DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button variant="ghost" onClick={() => setShowRemovePlanDialog(false)}>Avbryt</Button>
                                        <Button variant="destructive" onClick={handleRemovePlanned}>Fjern</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Button variant="glass" className="rounded-xl" iconLeft={<ArrowRightLeft className="w-4 h-4" />} onClick={() => router.push(`/dashboard/recipes?planDate=${plannedMeal.date}&replaceId=${plannedMeal.id}`)}>Bytt ut</Button>
                        </>
                    ) : (
                        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                            <DialogTrigger asChild>
                                <Button variant="glass-destructive" className="rounded-xl" iconLeft={<Trash2 className="w-4 h-4" />}>Slett oppskrift</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Slette oppskrift?</DialogTitle>
                                    <DialogDescription>
                                        Er du sikker på at du vil slette <strong>{recipe.name}</strong>? Dette kan ikke angres.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>Avbryt</Button>
                                    <Button variant="destructive" onClick={handleDelete}>Slett</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid md:grid-cols-3 gap-8">
                {/* Ingredients Column */}
                <div className="md:col-span-1 space-y-6">
                    {/* Notes Section (Only for Planned Mode) */}
                    {isPlannedMode && (
                        <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg text-indigo-900">Notater</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isEditing ? (
                                    <Textarea
                                        value={editNotes}
                                        onChange={(e) => setEditNotes(e.target.value)}
                                        placeholder="Legg til notater for dette måltidet..."
                                        className="bg-white"
                                    />
                                ) : (
                                    <p className="text-gray-700 italic text-sm">{displayedNotes || "Ingen notater lagt til."}</p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Servings Adjuster */}
                    {!isEditing && (
                        <Card className="bg-gray-50 border-dashed">
                            <CardContent className="p-4 flex items-center justify-between">
                                <span className="font-medium text-gray-700">Beregn ingredienser for:</span>
                                <div className="flex items-center gap-3 bg-white rounded-lg border px-2 py-1 shadow-sm">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 hover:bg-gray-100 rounded-full"
                                        onClick={() => setCurrentServings(Math.max(1, currentServings - 1))}
                                    >
                                        <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="font-bold w-4 text-center">{currentServings}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 hover:bg-gray-100 rounded-full"
                                        onClick={() => setCurrentServings(currentServings + 1)}
                                    >
                                        <Plus className="w-3 h-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Servings Adjuster (For Editing Plan) */}
                    {isPlannedMode && isEditing && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Juster planlagte porsjoner</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4">
                                    <Button variant="outline" size="icon" onClick={() => setEditServings(Math.max(1, editServings - 1))}>-</Button>
                                    <span className="text-xl font-bold w-8 text-center">{editServings}</span>
                                    <Button variant="outline" size="icon" onClick={() => setEditServings(editServings + 1)}>+</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="h-fit">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle>Ingredienser</CardTitle>
                            {isEditing && (
                                <Button variant="ghost" size="sm" onClick={handleAddIngredient} className="h-8 w-8 p-0">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                <AnimatePresence>
                                    {displayedIngredients?.map((ing, i) => {
                                        const isChecked = checkedIngredients.has(i)
                                        return (
                                            <motion.li
                                                layout
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                key={i}
                                                className={`flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 text-sm transition-colors ${isChecked && !isEditing ? 'text-gray-400 line-through' : ''}`}
                                                onClick={() => !isEditing && toggleIngredientCheck(i)}
                                                style={{ cursor: !isEditing ? 'pointer' : 'default' }}
                                            >
                                                {isEditing ? (
                                                    <IngredientRow
                                                        ingredient={ing}
                                                        index={i}
                                                        onChange={handleIngredientChange}
                                                        onRemove={handleRemoveIngredient}
                                                        compact
                                                    />
                                                ) : (
                                                    <>
                                                        <span className="font-medium flex items-center gap-2">
                                                            {isChecked && <Check className="w-3 h-3" />}
                                                            {ing.name}
                                                        </span>
                                                        <span className="whitespace-nowrap">{ing.amount} {ing.unit}</span>
                                                    </>
                                                )}
                                            </motion.li>
                                        )
                                    })}
                                </AnimatePresence>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Instructions Column */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fremgangsmåte</CardTitle>
                            <CardDescription>Steg-for-steg guide til å lage dette måltidet.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-8">
                                {recipe.instructions?.map((step, i) => (
                                    <div key={i} className="flex gap-4 group">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                            {i + 1}
                                        </div>
                                        <p className="text-gray-700 mt-1 leading-relaxed text-lg">{renderRichText(step)}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </motion.div>
        )}
        </AnimatePresence>
        </PageContainer>
    )
}
