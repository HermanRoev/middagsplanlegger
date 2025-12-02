import { z } from 'zod'

export const ingredientSchema = z.object({
  name: z.string().min(1, 'Ingrediensnavn er påkrevd'),
  amount: z.number().optional(),
  unit: z.string().optional(),
})

export const mealSchema = z.object({
  name: z.string().min(1, 'Navn på middagen er påkrevd'),
  servings: z.number().min(1, 'Antall porsjoner må være minst 1'),
  ingredients: z
    .array(ingredientSchema)
    .min(1, 'Minst én ingrediens er påkrevd'),
  instructions: z
    .array(z.string())
    .min(1, 'Minst ett instruksjonssteg er påkrevd'),
  imageUrl: z.string().optional(),
})

export type MealFormData = z.infer<typeof mealSchema>

// Stricter validation for data coming from Firestore
export const firestoreIngredientSchema = z.object({
  name: z.string(),
  amount: z.number().nullable(),
  unit: z.string(),
});

export const nutritionSchema = z.object({
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
});

export const createdBySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const firestoreMealSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Recipe name cannot be empty"),
  imageUrl: z.string().nullable(),
  servings: z.number().nullable(),
  ingredients: z.array(firestoreIngredientSchema),
  instructions: z.array(z.string()),
  prepTime: z.number().nullable(),
  costEstimate: z.number().nullable(),
  nutrition: nutritionSchema.optional(),
  rating: z.number().min(0).max(5).optional(),
  lastCooked: z.string().optional(),
  createdBy: createdBySchema.optional(),
});

export const firestorePlannedMealSchema = z.object({
    id: z.string(),
    date: z.string(),
    mealId: z.string(),
    mealName: z.string(),
    imageUrl: z.string().optional(),
    isShopped: z.boolean().optional(),
    isCooked: z.boolean().optional(),
    servings: z.number().optional(),
    scaledIngredients: z.array(firestoreIngredientSchema).optional(),
    ingredients: z.array(firestoreIngredientSchema).optional(),
    instructions: z.array(z.string()).optional(),
    plannedServings: z.number(),
    prepTime: z.number().optional(),
    costEstimate: z.number().optional(),
    nutrition: nutritionSchema.optional(),
    plannedBy: createdBySchema.optional(),
    originalMealId: z.string().optional(),
    notes: z.string().optional(),
});
