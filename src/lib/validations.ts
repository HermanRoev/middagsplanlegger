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
  instructions: z.string().min(1, 'Instruksjoner er påkrevd'),
  imageUrl: z.string().optional(),
})

export type MealFormData = z.infer<typeof mealSchema>
