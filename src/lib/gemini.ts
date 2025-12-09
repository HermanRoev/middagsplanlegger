import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { app } from "./firebase";

// Initialize Gemini Developer API backend
const ai = getAI(app, { backend: new GoogleAIBackend() });

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

        const prompt = `
            Analyze this receipt image and extract the grocery items.
            Return a JSON array where each object has:
            - "name": The name of the ingredient (clean up brand names if possible, e.g., "Milk" instead of "Tine Melk").
            - "amount": A numeric estimate of the quantity (default to 1 if unclear).
            - "unit": A best-guess unit (e.g., "stk", "kg", "l", "pack"). Use "stk" for countables.

            Ignore non-food items.
            Return ONLY valid JSON. No markdown code blocks.
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

        // Clean up potential markdown
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
            Return ONLY valid JSON. No markdown code blocks.
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

            Return ONLY valid JSON. No markdown code blocks.
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
