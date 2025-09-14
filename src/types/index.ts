// Fil: src/types/index.ts

// Definerer den strukturerte typen for en ingrediens
export interface Ingredient {
  name: string
  amount: number | null
  unit: 'g' | 'kg' | 'l' | 'dl' | 'stk' | 'ts' | 'ss'
}

// Definerer den komplette typen for en middag
export interface Meal {
  id: string
  name: string
  imageUrl: string | null
  servings: number | null
  ingredients: Ingredient[]
  instructions: string
  prepTime: number | null // Preparation time in minutes
  costEstimate: number | null // Estimated cost in NOK
}
