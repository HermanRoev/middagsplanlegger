import { Meal, CupboardItem, Ingredient } from '@/types'
import { normalizeUnit } from './units'

/**
 * Normalizes an ingredient name for better matching (removes plurals, lowers case, trims)
 */
function normalizeNameForMatching(name: string): string {
    let n = name.toLowerCase().trim()
    // Very basic Norwegian plural/form stripping for matching
    n = n.replace(/er$/, '').replace(/t$/, '').replace(/en$/, '').replace(/a$/, '')
    return n
}

export interface RecipeScoreResult {
    meal: Meal
    matchPercentage: number
    missingIngredients: Ingredient[]
    timeDecayScore: number // 0-100 (Higher means cooked longer ago, or never cooked)
    ratingScore: number // 0-100 based on rating
    totalPriorityScore: number // Combined heuristic score
}

/**
 * Computes how much of a recipe's ingredients exist in the user's cupboard.
 */
export function computeCupboardMatch(recipe: Meal, cupboard: CupboardItem[]): { matchPercentage: number, missingIngredients: Ingredient[] } {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
        return { matchPercentage: 0, missingIngredients: [] }
    }

    let matchedCount = 0;
    const missingIngredients: Ingredient[] = [];

    // Create a fast-lookup map of cupboard items by normalized name
    const cupboardMap = new Map<string, CupboardItem>();
    cupboard.forEach(item => {
        cupboardMap.set(normalizeNameForMatching(item.ingredientName), item);
    });

    recipe.ingredients.forEach(ing => {
        const normalizedName = normalizeNameForMatching(ing.name);
        const cupboardItem = cupboardMap.get(normalizedName);

        if (cupboardItem) {
            // We have the item in the cupboard!
            // Optional: Implement strict boolean matching OR fractional matching based on exact amounts.
            // For now, we do a binary "Do we have any of it?" check because cupboard tracking is often loose.
            if (cupboardItem.amount !== null && cupboardItem.amount > 0) {
                // If the recipe needs 500g and we only have 100g, it might be a partial match, 
                // but a binary "has it or not" is a good V1 heuristic.
                matchedCount++;
            } else {
                // We track it, but we are out of stock
                missingIngredients.push(ing);
            }
        } else {
            // Not in cupboard at all
            missingIngredients.push(ing);
        }
    });

    const matchPercentage = Math.round((matchedCount / recipe.ingredients.length) * 100);

    return { matchPercentage, missingIngredients };
}

/**
 * Calculates a time decay score based on when the meal was last cooked.
 * Meals cooked very recently get a penalty (close to 0).
 * Meals never cooked or cooked months ago get a max score (100).
 */
export function computeTimeDecayScore(lastCooked?: string): number {
    if (!lastCooked) return 100; // Never cooked = max priority to try

    const cookedDate = new Date(lastCooked);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - cookedDate.getTime()) / (1000 * 3600 * 24));

    // Penalty logic: 
    // 0-3 days ago: 0 score
    // 4-14 days ago: Linear climb up to 70
    // 15+ days ago: Caps at 100
    if (daysSince <= 3) return 0;
    if (daysSince >= 21) return 100;

    // Linear interpolation between day 3 and day 21 (18 day span)
    return Math.round(((daysSince - 3) / 18) * 100);
}

/**
 * Calculates the combined heuristic score for a list of meals.
 */
export function scoreMeals(meals: Meal[], cupboard: CupboardItem[] = []): RecipeScoreResult[] {
    return meals.map(meal => {
        const { matchPercentage, missingIngredients } = computeCupboardMatch(meal, cupboard);
        const timeDecayScore = computeTimeDecayScore(meal.lastCooked);

        // Rating score is just rating (0-5) mapped to 0-100. Unrated meals get a neutral 50.
        const ratingScore = meal.rating ? (meal.rating / 5) * 100 : 50;

        // Weights: 
        // 40% Cupboard Match (What can I make?)
        // 40% Time Decay (What haven't I had in a while?)
        // 20% Rating (Is it a household favorite?)
        const totalPriorityScore = Math.round(
            (matchPercentage * 0.4) +
            (timeDecayScore * 0.4) +
            (ratingScore * 0.2)
        );

        return {
            meal,
            matchPercentage,
            missingIngredients,
            timeDecayScore,
            ratingScore,
            totalPriorityScore
        };
    }).sort((a, b) => b.totalPriorityScore - a.totalPriorityScore); // Sort highest first
}
