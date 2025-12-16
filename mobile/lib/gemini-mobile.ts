import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { app } from './firebase';
import * as FileSystem from 'expo-file-system';

// Initialize AI with the GoogleAIBackend
const ai = getAI(app, { backend: new GoogleAIBackend() });

const VALID_UNITS = ['g', 'kg', 'l', 'dl', 'stk', 'ss', 'ts'];

// Prompt instructions helper
function getPromptInstructions(): string {
    return `
       IMPORTANT: Return ONLY valid JSON. Do not include any markdown formatting like \`\`\`json or \`\`\`.

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
            - "name": The name of the ingredient (clean up brand names).
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
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error parsing receipt mobile:", error);
        throw new Error("Failed to analyze receipt.");
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

            Return a JSON object with:
            - "name": Recipe title.
            - "description": Short description.
            - "prepTime": Prep time in minutes (number).
            - "servings": Number of servings (number).
            - "ingredients": Array of objects { "name", "amount" (number), "unit" (string) }.
            - "instructions": Array of strings.
            - "nutrition": Object { "calories", "protein", "carbs", "fat" }.

            ${getPromptInstructions()}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);
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

            Return a JSON object with:
            - "name": Recipe title.
            - "description": Short description.
            - "prepTime": Prep time in minutes (number).
            - "servings": Number of servings (number).
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
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error generating recipe image mobile:", error);
        throw new Error("Failed to generate recipe from image.");
    }
}
