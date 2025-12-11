import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { app } from "./firebase";
import { getAllIngredients } from "./ingredients";

// Initialize the Gemini Developer API backend service
const ai = getAI(app, { backend: new GoogleAIBackend() });

const VALID_UNITS = ['g', 'kg', 'l', 'dl', 'stk', 'ss', 'ts'];

async function getPromptInstructions(): Promise<string> {
    let ingredientNames = "";
    try {
        const ingredients = await getAllIngredients();
        ingredientNames = ingredients.map(i => i.id).join(", ");
    } catch (error) {
        console.warn("Failed to fetch ingredients for AI prompt:", error);
        // Fallback or empty list if firestore fails, so we don't break the whole feature
    }

    return `
    STRICT OUTPUT FORMATTING:
    1. Return ONLY valid JSON. Do not wrap it in markdown code blocks (e.g. \`\`\`json). Just the raw JSON string.
    2. Use ONLY these units: ${VALID_UNITS.join(", ")}.
       - Map 'tablespoon', 'tbsp' -> 'ss'
       - Map 'teaspoon', 'tsp' -> 'ts'
       - Map 'pcs', 'each', 'count' -> 'stk'
       - Map 'liters' -> 'l', 'deciliters' -> 'dl', 'grams' -> 'g', 'kilograms' -> 'kg'
       - If unit is unknown or missing, default to 'stk'.
    3. Ingredient Naming:
       Below is a list of existing ingredients in the database.
       If an identified ingredient closely matches one in this list (case-insensitive, singular/plural), use the EXACT name from the list.
       Existing Ingredients List: [${ingredientNames}]
    `;
}

export async function parseReceiptImage(imageFile: File): Promise<{ name: string, amount: number, unit: string }[]> {
    try {
        const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });

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
            Analyze this receipt image and extract the grocery items.
            Return a JSON array where each object has:
            - "name": The name of the ingredient (clean up brand names if possible, e.g., "Milk" instead of "Tine Melk").
            - "amount": A numeric estimate of the quantity (default to 1 if unclear).
            - "unit": The unit.

            Ignore non-food items.

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

        // Clean up potential markdown just in case, though prompt says strict
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonString);
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
    ingredients: { name: string, amount: number, unit: string }[],
    instructions: string[],
    nutrition: { calories: number, protein: number, carbs: number, fat: number }
}> {
    try {
        const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });

        const instructions = await getPromptInstructions();
        const prompt = `
            You are a professional chef. Create a structured recipe based on the following description or URL content:
            "${text}"

            Return a JSON object with the following fields:
            - "name": Recipe title.
            - "description": A short, appetizing description.
            - "prepTime": Preparation time in minutes (number).
            - "servings": Number of servings (number).
            - "ingredients": Array of objects { "name", "amount" (number), "unit" (string) }.
            - "instructions": Array of strings, each being a step.
            - "nutrition": Object with estimates per serving: { "calories" (number), "protein" (number g), "carbs" (number g), "fat" (number g) }.

            If the input is vague, improvise a good recipe that matches the intent.

            ${instructions}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonString);
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
    ingredients: { name: string, amount: number, unit: string }[],
    instructions: string[],
    nutrition: { calories: number, protein: number, carbs: number, fat: number }
}> {
    try {
        const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });

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
            Analyze this image of food or a recipe. Identify the dish and create a structured recipe for it.

            Return a JSON object with the following fields:
            - "name": Recipe title.
            - "description": A short, appetizing description.
            - "prepTime": Preparation time in minutes (number).
            - "servings": Number of servings (number).
            - "ingredients": Array of objects { "name", "amount" (number), "unit" (string) }.
            - "instructions": Array of strings, each being a step.
            - "nutrition": Object with estimates per serving: { "calories" (number), "protein" (number g), "carbs" (number g), "fat" (number g) }.

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
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error generating recipe from image:", error);
        throw new Error("Failed to generate recipe from image.");
    }
}
