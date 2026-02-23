import { getAI, getGenerativeModel, GoogleAIBackend, getImagenModel } from 'firebase/ai'
import { app } from './firebase'
import { getAllIngredients } from './ingredients'

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

async function getPromptInstructions(): Promise<string> {
    const ingredients = await getAllIngredients();
    const ingredientNames = ingredients.map(i => i.id).join(', ');

    return `
    ROLE AND CONTEXT:
    You are the AI brain behind "Middagsplanleggeren" (The Dinner Planner), a modern Norwegian meal planning application. 
    Your goal is to parse user inputs (text, images, video) and return highly structured, accurate culinary data.
    IMPORTANT: ALL TEXT, INCLUDING INGREDIENT NAMES, RECIPE TITLES, DESCRIPTIONS, AND INSTRUCTIONS, MUST BE IN NORWEGIAN. NEVER USE ENGLISH.

    OUTPUT FORMAT:
    - You must return ONLY valid, raw JSON. 
    - Do NOT include any markdown formatting blocks like \`\`\`json or \`\`\`.
    - Do NOT include any conversational text before or after the JSON.
    - Output must be strictly typed as requested in the task prompt.

    INGREDIENT PARSING RULES:
       - Allowed units: ${VALID_UNITS.join(', ')}.
       - MAPPING RULES:
         - Countable items (e.g., eggs, tortillas, buns, cans, jars, taco shells, avocados, onions, fruits, vegetables when whole) MUST use 'stk'.
         - Liquids (e.g., milk, water, oil, juice, salsa, cream, soy sauce, broth) MUST use 'dl' or 'l'.
         - Spices/small amounts (e.g., salt, pepper, cumin, sugar, baking powder) often use 'ts' or 'ss'.
         - Bulk solids (e.g., flour, meat, cheese, rice, pasta, chopped vegetables) usually use 'g' or 'kg'.

       - UNIT CONVERSIONS:
         - 'ml', 'cl' -> 'dl'
         - 'tbsp', 'tablespoon' -> 'ss'
         - 'tsp', 'teaspoon' -> 'ts'
         - 'lb', 'oz' -> 'g' (approximate conversion)
         - 'cup' -> 'dl' (approx 2.4 dl)
         - 'pcs', 'ea', 'unit', 'slice' -> 'stk'

       - If the unit is missing or implies a count (like "1 onion", "2 tomatoes"), use 'stk'.
       - NEVER default to 'g' for countable items like shells, tortillas, or whole produce.

       If an extracted ingredient closely matches one in this list (case-insensitive, singular/plural), use the EXACT name from the list.
       Existing Ingredients List: [${ingredientNames}]
    `;
}

export async function parseCupboardVideo(videoFile: File): Promise<{ name: string, amount: number, unit: string }[]> {
    try {
        const model = getGenerativeModel(ai, {
            model: "gemini-3-pro-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Convert file to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(videoFile);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data URL prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });

        const instructions = await getPromptInstructions();
        const prompt = `
            TASK: Analyze this video of a kitchen cupboard or pantry. 
            GOAL: Identify all visible food items and estimate their quantities to help the user track their inventory.
            
            OUTPUT SCHEMA: 
            Return a JSON array where each object represents an ingredient and strictly conforms to this structure:
            [
              {
                "name": "string (the name of the ingredient in Norwegian)",
                "amount": number (a realistic numeric estimate of the quantity),
                "unit": "string (the unit of measurement)"
              }
            ]

            INSTRUCTIONS:
            - Scan the video carefully frame by frame.
            - Ignore all non-food items (e.g., plates, cleaning supplies).
            - Group similar items if they are the exact same product.
            - REMEMBER: TRANSLATE ALL ITEM NAMES TO NORWEGIAN.

            ${instructions}
        `;

        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    data: base64Data,
                    mimeType: videoFile.type
                }
            }
        ]);

        const responseText = result.response.text();

        return parseJsonResponse<{ name: string, amount: number, unit: string }[]>(responseText);
    } catch (error) {
        console.error("Error parsing video:", error);
        throw new Error("Failed to analyze video.");
    }
}

export async function parseReceiptImage(imageFile: File): Promise<{ name: string, amount: number, unit: string }[]> {
    try {
        const model = getGenerativeModel(ai, {
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Convert file to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(imageFile);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });

        const instructions = await getPromptInstructions();
        const prompt = `
            TASK: Analyze this receipt image and extract the purchased grocery items.
            GOAL: Convert a raw physical or digital receipt into a structured inventory list.

            OUTPUT SCHEMA: 
            Return a JSON array where each object represents an ingredient and strictly conforms to this structure:
            [
              {
                "name": "string (a clean, generic name for the ingredient in Norwegian)",
                "amount": number (the quantity purchased, default to 1 if unclear),
                "unit": "string (the unit of measurement)"
              }
            ]

            INSTRUCTIONS:
            - Clean up brand names and abbreviations (e.g., "TINE MELK HEL 1L" -> "Melk", "GILDE KJØTTDEIG SVI/STORFE" -> "Kjøttdeig").
            - Ignore non-food items (e.g., plastic bags, toilet paper, batteries).
            - Ignore prices, store names, dates, and payment information.
            - REMEMBER: TRANSLATE ALL ITEM NAMES TO NORWEGIAN EVEN IF THE RECEIPT IS IN ANOTHER LANGUAGE.

            ${instructions}
        `;

        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    data: base64Data,
                    mimeType: imageFile.type
                }
            }
        ]);

        const responseText = result.response.text();

        return parseJsonResponse<{ name: string, amount: number, unit: string }[]>(responseText);
    } catch (error) {
        console.error("Error parsing receipt:", error);
        throw new Error("Failed to analyze receipt.");
    }
}

export async function generateRecipeFromText(text: string): Promise<{
    name: string,
    description: string,
    prepTime: number,
    servings: number,
    tags: string[],
    difficulty: "Enkel" | "Middels" | "Avansert",
    ingredients: { name: string, amount: number, unit: string }[],
    instructions: string[],
    nutrition: { calories: number, protein: number, carbs: number, fat: number }
}> {
    try {
        const model = getGenerativeModel(ai, {
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const instructions = await getPromptInstructions();
        const prompt = `
            TASK: Create a fully structured recipe based on the provided user description or URL content.
            USER INPUT: "${text}"

            GOAL: Act as a master Norwegian chef and translate the user's vague idea or unformatted text into a precise, step-by-step culinary guide.

            OUTPUT SCHEMA:
            Return a JSON object that strictly conforms to this structure:
            {
              "name": "string (An appetizing Recipe title in Norwegian)",
              "description": "string (A short, mouth-watering description in Norwegian)",
              "prepTime": number (Total preparation and cooking time in minutes),
              "servings": number (Number of servings, default to 4 if unspecified),
              "tags": [
                 "string (2-4 relevant categories in Norwegian, e.g., 'Raskt', 'Fisk', 'Helgekos', 'Vegetar', 'Barnevennlig')"
              ],
              "difficulty": "string (Must be exactly one of: 'Enkel', 'Middels', 'Avansert')",
              "ingredients": [
                 { "name": "string", "amount": number, "unit": "string" }
              ],
              "instructions": [
                 "string (Clear, step-by-step cooking instruction)"
              ],
              "nutrition": {
                 "calories": number,
                 "protein": number,
                 "carbs": number,
                 "fat": number
              }
            }

            INSTRUCTIONS:
            - If the user input is just a concept (like "make me a healthy chicken dish"), be creative and invent a realistic, delicious recipe.
            - Ensure chronological order in instructions.
            - Provide reasonable, scientifically plausible estimates for the nutritional data per serving.
            - CRITICAL: EVERY SINGLE FIELD (name, description, tags, ingredient names, instructions) MUST BE WRITTEN IN PERFECT NORWEGIAN.

            ${instructions}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return parseJsonResponse<{
            name: string,
            description: string,
            prepTime: number,
            servings: number,
            tags: string[],
            difficulty: "Enkel" | "Middels" | "Avansert",
            ingredients: { name: string, amount: number, unit: string }[],
            instructions: string[],
            nutrition: { calories: number, protein: number, carbs: number, fat: number }
        }>(responseText);
    } catch (error) {
        console.error("Error generating recipe:", error);
        throw new Error("Failed to generate recipe.");
    }
}

export async function generateRecipeFromImage(imageFile: File): Promise<{
    name: string,
    description: string,
    prepTime: number,
    servings: number,
    tags: string[],
    difficulty: "Enkel" | "Middels" | "Avansert",
    ingredients: { name: string, amount: number, unit: string }[],
    instructions: string[],
    nutrition: { calories: number, protein: number, carbs: number, fat: number }
}> {
    try {
        const model = getGenerativeModel(ai, {
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Convert file to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(imageFile);
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });

        const instructions = await getPromptInstructions();
        const prompt = `
            TASK: Reverse-engineer a recipe from an image of a cooked dish or a physical recipe card.
            GOAL: Identify the food shown and generate a complete, authentic recipe to recreate it.

            OUTPUT SCHEMA:
            Return a JSON object that strictly conforms to this structure:
            {
              "name": "string (An appetizing Recipe title in Norwegian)",
              "description": "string (A short, mouth-watering description in Norwegian)",
              "prepTime": number (Total preparation and cooking time in minutes),
              "servings": number (Number of servings, default to 4),
              "tags": [
                 "string (2-4 relevant categories in Norwegian, e.g., 'Sunn', 'Grateng', 'Svinekjøtt')"
              ],
              "difficulty": "string (Must be exactly one of: 'Enkel', 'Middels', 'Avansert')",
              "ingredients": [
                 { "name": "string", "amount": number, "unit": "string" }
              ],
              "instructions": [
                 "string (Clear, step-by-step cooking instruction)"
              ],
              "nutrition": {
                 "calories": number,
                 "protein": number,
                 "carbs": number,
                 "fat": number
              }
            }

            INSTRUCTIONS:
            - Analyze the image to identify key ingredients (e.g., type of meat, visible vegetables, sauce consistency).
            - If it's a photo of food, invent a plausible recipe that matches the visual output.
            - If it's a photo of text (a cookbook page), extract the recipe faithfully while standardizing units according to the rules.
            - CRITICAL: NO MATTER WHAT LANGUAGE THE ORIGINAL RECIPE OR IMAGE IS IN, YOU MUST TRANSLATE AND OUTPUT THE ENTIRE RESPONSE IN PERFECT NORWEGIAN.

            ${instructions}
        `;

        const result = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    data: base64Data,
                    mimeType: imageFile.type
                }
            }
        ]);

        const responseText = result.response.text();

        return parseJsonResponse<{
            name: string,
            description: string,
            prepTime: number,
            servings: number,
            tags: string[],
            difficulty: "Enkel" | "Middels" | "Avansert",
            ingredients: { name: string, amount: number, unit: string }[],
            instructions: string[],
            nutrition: { calories: number, protein: number, carbs: number, fat: number }
        }>(responseText);
    } catch (error) {
        console.error("Error generating recipe from image:", error);
        throw new Error("Failed to generate recipe from image.");
    }
}

export async function generateRecipeImage(dishName: string, description: string): Promise<File> {
    try {
        // Using Imagen 4 Fast for best price/performance balance
        const model = getImagenModel(ai, {
            model: "imagen-4.0-fast-generate-001",
            generationConfig: {
                numberOfImages: 1,
                aspectRatio: "4:3",
                imageFormat: {
                    mimeType: "image/jpeg"
                }
            } as any
        });

        const basePrompt = `A professional, high-quality, photorealistic food photography shot of ${dishName}.`;
        let prompt = "";

        if (description && description.trim() !== "") {
            prompt = `${basePrompt} 
        User provided styling description: "${description}".
        
        CRITICAL INSTRUCTIONS: 
        1. The primary subject MUST be exactly "${dishName}". Ignore the user description if it describes a completely different food item.
        2. NEVER include any text, words, letters, labels, or watermarks in the image. The user description is for styling only, NOT text to be written.`;
        } else {
            prompt = `${basePrompt} 
        The image should be beautifully plated, feature cinematic lighting, look appetizing, and be set on a nice dining table with a neutral background. Highly detailed, 4k.`;
        }

        const result = await model.generateImages(prompt);

        if (!result.images || result.images.length === 0) {
            throw new Error("No images generated.");
        }

        const base64Image = result.images[0].bytesBase64Encoded;
        const byteCharacters = atob(base64Image);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const mimeType = 'image/jpeg';
        const blob = new Blob([byteArray], { type: mimeType });

        return new File([blob], `${dishName.replace(/\s+/g, '_').toLowerCase()}_ai.jpg`, { type: mimeType });

    } catch (error) {
        console.error("Error generating recipe image:", error);
        throw new Error("Failed to generate recipe image.");
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
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
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
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return parseJsonResponse<{ date: string; recipeId: string; reason: string }[]>(responseText);
    } catch (error) {
        console.error("Error generating menu suggestions:", error);
        throw new Error("Failed to generate menu suggestions.");
    }
}
