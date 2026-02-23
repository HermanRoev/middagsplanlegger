// Fil: src/types/index.ts

// Definerer den strukturerte typen for en ingrediens
export interface Ingredient {
  name: string
  amount: number | null
  unit: string // Relaxed from literal union to string to allow flexible units from AI
  isShopped?: boolean
}

export interface Nutrition {
  calories?: number // kcal
  protein?: number // g
  carbs?: number // g
  fat?: number // g
}

// Definerer den komplette typen for en middag
export interface Meal {
  id: string
  name: string
  imageUrl: string | null
  servings: number | null
  ingredients: Ingredient[]
  instructions: string[]
  prepTime: number | null // Preparation time in minutes
  costEstimate: number | null // Estimated cost in NOK
  nutrition?: Nutrition
  rating?: number // 0-5 (computed average or legacy single rating)
  ratings?: Record<string, number> // User-specific ratings map
  tags?: string[] // e.g. ["Raskt", "Barn", "Fisk"]
  difficulty?: "Enkel" | "Middels" | "Avansert"
  lastCooked?: string // ISO Date string
  createdBy?: {
    id: string
    name: string
  }
  householdId?: string
}

export interface PlannedMeal {
  id: string
  date: string // YYYY-MM-DD
  mealId: string
  mealName: string
  imageUrl?: string
  isShopped?: boolean
  isCooked?: boolean
  servings?: number
  scaledIngredients?: Ingredient[]
  ingredients?: Ingredient[]
  instructions?: string[]
  plannedServings: number
  prepTime?: number
  costEstimate?: number
  nutrition?: Nutrition
  plannedBy?: {
    id: string
    name: string
  }
  originalMealId?: string
  notes?: string
  householdId?: string
  userId?: string
}

export interface CupboardItem {
  id: string
  userId: string
  ingredientName: string
  unit: string
  amount: number | null
  wantedAmount: number | null
  threshold: number | null
  householdId?: string
}

export interface Suggestion {
  id: string
  text: string
  votes: number
  votedBy?: string[]
  status: 'pending' | 'approved' | 'rejected'
  suggestedBy?: {
    id: string
    name: string
  }
  forDate?: string // YYYY-MM-DD (Optional, for suggesting a specific day)
  createdAt: string
  householdId?: string
}
