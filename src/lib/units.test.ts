
import { describe, it, expect } from 'vitest';
import { normalizeUnit, formatUnit, Unit } from './units';

describe('units', () => {
  describe('normalizeUnit', () => {
    it('should normalize kg to g', () => {
      expect(normalizeUnit(1.5, 'kg')).toEqual({ amount: 1500, unit: 'g' });
    });

    it('should normalize l to dl', () => {
      expect(normalizeUnit(0.5, 'l')).toEqual({ amount: 5, unit: 'dl' });
    });

    it('should keep g as g', () => {
      expect(normalizeUnit(500, 'g')).toEqual({ amount: 500, unit: 'g' });
    });

    it('should keep dl as dl', () => {
      expect(normalizeUnit(5, 'dl')).toEqual({ amount: 5, unit: 'dl' });
    });

    it('should handle other units gracefully', () => {
      expect(normalizeUnit(2, 'stk')).toEqual({ amount: 2, unit: 'stk' });
      expect(normalizeUnit(1, 'ss')).toEqual({ amount: 1, unit: 'ss' });
    });
  });

  describe('formatUnit', () => {
    it('should format g to kg if >= 1000', () => {
      expect(formatUnit(1500, 'g')).toBe('1.5 kg');
    });

    it('should keep g if < 1000', () => {
      expect(formatUnit(500, 'g')).toBe('500 g');
    });

    it('should format dl to l if >= 10', () => {
      expect(formatUnit(15, 'dl')).toBe('1.5 l');
    });

    it('should keep dl if < 10', () => {
      expect(formatUnit(5, 'dl')).toBe('5 dl');
    });

    it('should format other units as is', () => {
      expect(formatUnit(2, 'stk')).toBe('2 stk');
    });
  });
});
