import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { app } from './firebase';
import * as FileSystem from 'expo-file-system';

// Initialize AI with the GoogleAIBackend
const ai = getAI(app, { backend: new GoogleAIBackend() });

const VALID_UNITS = ['g', 'kg', 'l', 'dl', 'stk', 'ss', 'ts'];

function extractJson(text: string): string {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstIndex = cleaned.search(/[\[{]/);
    const lastIndex = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (firstIndex !== -1 && lastIndex !== -1) {
        return cleaned.slice(firstIndex, lastIndex + 1).trim();
    }
    return cleaned;
}

function parseJsonResponse<T>(text: string): T {
    const jsonString = extractJson(text);
    return JSON.parse(jsonString) as T;
}

// Prompt instructions helper
function getPromptInstructions(): string {
    return `
    IMPORTANT: Return ONLY valid JSON. Do not include any markdown formatting like \`\`\`json or \`\`\`.
    - Output must be a single JSON object/array with double quotes.
    - No extra text before or after the JSON.
    - No comments, no trailing commas.
    - ALL TEXT (such as ingredient names, descriptions, and instructions) MUST BE IN NORWEGIAN.

       Strictly adhere to these rules for units:
       - Allowed units: ${VALID_UNITS.join(', ')}.
       - Countable items (eggs, buns, cans, etc) MUST use 'stk'.
       - Liquids MUST use 'dl' or 'l'.
       - Spices use 'ts' or 'ss'.
       - Bulk solids use 'g' or 'kg'.

       MAPPING:
       - 'ml', 'cl' -> 'dl'
       - 'tbsp' -> 'ss'
       - 'tsp' -> 'ts'
       - 'oz', 'lb' -> 'g'
       - 'cup' -> 'dl'
       - 'pcs', 'ea' -> 'stk'

       If unit is missing, use 'stk'.
    `;
}

export async function parseReceiptImageMobile(imageUri: string): Promise<{ name: string, amount: number, unit: string }[]> {
    try {
        const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });
        // Correct usage for expo-file-system: it might not export EncodingType directly in all versions or just string "base64" works
        const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });

        const prompt = `
            Analyze this receipt image and extract the grocery items.
            Return a JSON array where each object has:
            - "name": The name of the ingredient translated to Norwegian (clean up brand names).
            - "amount": A numeric estimate of the quantity (default to 1).
            - "unit": The unit.

            Ignore non-food items.

            ${getPromptInstructions()}
        `;

        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    data: base64,
                    mimeType: 'image/jpeg'
                }
            }
        ]);

        const responseText = result.response.text();
        return parseJsonResponse<{ name: string, amount: number, unit: string }[]>(responseText);
    } catch (error) {
        console.error("Error parsing receipt mobile:", error);
        throw new Error("Failed to analyze receipt.");
    }
}

export async function parseCupboardVideoMobile(videoUri: string): Promise<{ name: string, amount: number, unit: string }[]> {
    try {
        const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" }); // Using Flash model which supports video

        // Read video file as base64
        const base64 = await FileSystem.readAsStringAsync(videoUri, { encoding: 'base64' });

        const prompt = `
            Analyze this video of a cupboard/pantry and identify the food items and their approximate quantities.
            Return a JSON array where each object has:
            - "name": The name of the ingredient translated to Norwegian.
            - "amount": A numeric estimate of the quantity.
            - "unit": The unit.

            Ignore non-food items.

            ${getPromptInstructions()}
        `;

        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    data: base64,
                    mimeType: 'video/mp4' // Assuming mp4 or similar compatible format
                }
            }
        ]);

        const responseText = result.response.text();
        return parseJsonResponse<{ name: string, amount: number, unit: string }[]>(responseText);
    } catch (error) {
        console.error("Error parsing video mobile:", error);
        throw new Error("Failed to analyze video.");
    }
}

export async function generateRecipeFromTextMobile(text: string): Promise<{
    name: string,
    description: string,
    prepTime: number,
    servings: number,
    ingredients: { name: string, amount: number, unit: string }[],
    instructions: string[],
    nutrition: { calories: number, protein: number, carbs: number, fat: number }
}> {
    try {
        const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });
        const prompt = `
            You are a professional chef. Create a structured recipe based on the following description:
            "${text}"
            IMPORTANT: ENTIRE RECIPE MUST BE IN NORWEGIAN.

            Return a JSON object with:
            - "name": Recipe title (Norwegian).
            - "description": Short description (Norwegian).
            - "prepTime": Prep time in minutes (number).
            - "servings": Number of servings (number).
            - "tags": Array of strings (2-4 relevant categories in Norwegian, e.g., 'Raskt', 'Fisk', 'Helgekos', 'Vegetar', 'Barnevennlig').
            - "difficulty": String (Must be exactly one of: 'Enkel', 'Middels', 'Avansert').
            - "ingredients": Array of objects { "name", "amount" (number), "unit" (string) }.
            - "instructions": Array of strings.
            - "nutrition": Object { "calories", "protein", "carbs", "fat" }.

            ${getPromptInstructions()}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return parseJsonResponse<{
            name: string,
            description: string,
            prepTime: number,
            servings: number,
            tags?: string[],
            difficulty?: "Enkel" | "Middels" | "Avansert",
            ingredients: { name: string, amount: number, unit: string }[],
            instructions: string[],
            nutrition: { calories: number, protein: number, carbs: number, fat: number }
        }>(responseText);
    } catch (error) {
        console.error("Error generating recipe text mobile:", error);
        throw new Error("Failed to generate recipe.");
    }
}

export async function generateRecipeFromImageMobile(imageUri: string): Promise<any> {
    try {
        const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });
        const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });

        const prompt = `
            Analyze this image of food. Identify the dish and create a structured recipe.
            IMPORTANT: ENTIRE RECIPE MUST BE IN NORWEGIAN.

            Return a JSON object with:
            - "name": Recipe title (Norwegian).
            - "description": Short description (Norwegian).
            - "prepTime": Prep time in minutes (number).
            - "servings": Number of servings (number).
            - "tags": Array of strings (2-4 relevant categories in Norwegian, e.g., 'Raskt', 'Fisk', 'Helgekos', 'Vegetar', 'Barnevennlig').
            - "difficulty": String (Must be exactly one of: 'Enkel', 'Middels', 'Avansert').
            - "ingredients": Array of objects { "name", "amount" (number), "unit" (string) }.
            - "instructions": Array of strings.
            - "nutrition": Object { "calories", "protein", "carbs", "fat" }.

            ${getPromptInstructions()}
        `;

        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    data: base64,
                    mimeType: 'image/jpeg'
                }
            }
        ]);

        const responseText = result.response.text();
        return parseJsonResponse<{
            name: string,
            description: string,
            prepTime: number,
            servings: number,
            tags?: string[],
            difficulty?: "Enkel" | "Middels" | "Avansert",
            ingredients: { name: string, amount: number, unit: string }[],
            instructions: string[],
            nutrition: { calories: number, protein: number, carbs: number, fat: number }
        }>(responseText);
    } catch (error) {
        console.error("Error generating recipe image mobile:", error);
        throw new Error("Failed to generate recipe from image.");
    }
}

export interface MinimalRecipeData {
    id: string;
    name: string;
    tags: string[];
    difficulty?: "Enkel" | "Middels" | "Avansert";
    prepTime?: number;
    matchPercentage: number;
    daysSinceCooked: number | "Aldri";
}

export async function generateMenuSuggestions(
    recipes: MinimalRecipeData[],
    daysToFill: string[] // Array of date strings like ["2023-11-01", "2023-11-02"]
): Promise<{ date: string; recipeId: string; reason: string }[]> {
    try {
        const model = getGenerativeModel(ai, {
            model: "gemini-2.5-flash", // Mobile handles natively 2.5 flash right now
        });

        const prompt = `
            TASK: Suggest exactly ${daysToFill.length} diverse dinner recipes for the user's upcoming week from their saved list.
            
            TARGET DAYS TO FILL:
            ${JSON.stringify(daysToFill, null, 2)}
            (Note: You must assign exactly ONE unique recipe to each of these days).

            USER'S AVALIABLE RECIPES (Pre-filtered and mathematically ranked):
            ${JSON.stringify(recipes, null, 2)}

            GOAL & RULES for a Master Norwegian Dinner Planner:
            1. DIVERSITY IS KING: Do NOT pick highly similar meals back-to-back. If Monday is Taco, Tuesday CANNOT be Burrito or Nachos. If Wednesday is Fish Soup, Thursday CANNOT be another Soup or Fish dish. Look at the 'tags' and 'name' to ensure culinary variety.
            2. WEEKDAY VS WEEKEND: Pay attention to the day of the week for the dates provided. For Mondays-Thursdays, heavily prioritize 'Enkel' (Easy) and low 'prepTime' (under 30m) recipes. For Fridays-Sundays, allow 'Middels' or 'Avansert' recipes, such as 'Helgekos', Tacos, and slow-cooked meals.
            3. INGREDIENT REUSE: Prioritize recipes with a HIGH 'matchPercentage' (ingredients they already have).
            4. FREQUENCY: Prioritize recipes that haven't been cooked recently ('daysSinceCooked' is high or 'Aldri').

            OUTPUT SCHEMA:
            Return a JSON array where each object strictly conforms to this structure:
            [
              {
                "date": "string (The exact date string from the TARGET DAYS TO FILL array)",
                "recipeId": "string (The exact 'id' from the chosen recipe)",
                "reason": "string (A short, personalized sentence in Norwegian explaining WHY you chose this for this specific day. E.g., 'Perfekt rask fiskemiddag på en travel tirsdag, og dere har nesten alt i skapet!', or 'Taco er en klassiker på fredager, og det er lenge siden sist.')"
              }
            ]

            ${getPromptInstructions()}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return parseJsonResponse<{ date: string; recipeId: string; reason: string }[]>(responseText);
    } catch (error) {
        console.error("Error generating menu suggestions:", error);
        throw new Error("Failed to generate menu suggestions.");
    }
}
