import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateRecipeFromText } from './gemini';
import { getAllIngredients } from './ingredients';

// Mock firebase/ai
const mockGenerateContent = vi.fn();
vi.mock('firebase/ai', () => ({
  getAI: vi.fn(),
  getGenerativeModel: vi.fn(() => ({
    generateContent: mockGenerateContent,
  })),
  GoogleAIBackend: vi.fn(),
}));

// Mock firebase app
vi.mock('./firebase', () => ({
  app: {},
}));

// Mock ingredients
vi.mock('./ingredients', () => ({
  getAllIngredients: vi.fn(),
}));

describe('gemini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ name: "Test Recipe" }) // Simple valid JSON
      }
    });
  });

  it('should include ingredients and units in the prompt', async () => {
    // Setup mock ingredients
    vi.mocked(getAllIngredients).mockResolvedValue([
      { id: 'Tomato' },
      { id: 'Cheese' }
    ]);

    await generateRecipeFromText('Make a pizza');

    const calls = mockGenerateContent.mock.calls;
    expect(calls.length).toBe(1);
    const promptArg = calls[0][0];

    // Check for units
    expect(promptArg).toContain("Use ONLY these units: g, kg, l, dl, stk, ss, ts");

    // Check for ingredients
    expect(promptArg).toContain("Existing Ingredients List: [Tomato, Cheese]");

    // Check for strict JSON
    expect(promptArg).toContain("Return ONLY valid JSON");
  });

  it('should handle empty ingredients list gracefully', async () => {
     vi.mocked(getAllIngredients).mockResolvedValue([]);

     await generateRecipeFromText('Make a pizza');

     const calls = mockGenerateContent.mock.calls;
     const promptArg = calls[0][0];

     expect(promptArg).toContain("Existing Ingredients List: []");
  });
});
