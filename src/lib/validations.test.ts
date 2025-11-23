import { describe, it, expect } from 'vitest';
import { ingredientSchema, mealSchema } from './validations';

describe('validations', () => {
  describe('ingredientSchema', () => {
    it('should validate valid ingredient', () => {
      const valid = { name: 'Carrot', amount: 2, unit: 'stk' };
      expect(ingredientSchema.safeParse(valid).success).toBe(true);
    });

    it('should require name', () => {
      const invalid = { amount: 2, unit: 'stk' };
      expect(ingredientSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('mealSchema', () => {
    it('should validate valid meal', () => {
      const valid = {
        name: 'Soup',
        servings: 4,
        ingredients: [{ name: 'Carrot', amount: 2, unit: 'stk' }],
        instructions: ['Chop carrots', 'Boil water'],
      };
      expect(mealSchema.safeParse(valid).success).toBe(true);
    });

    it('should require at least one ingredient', () => {
      const invalid = {
        name: 'Soup',
        servings: 4,
        ingredients: [],
        instructions: ['Chop carrots'],
      };
      expect(mealSchema.safeParse(invalid).success).toBe(false);
    });
  });
});
