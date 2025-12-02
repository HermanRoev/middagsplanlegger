
export type Unit = 'g' | 'kg' | 'l' | 'dl' | 'stk' | 'ss' | 'ts'

export function normalizeUnit(amount: number, unit: string): { amount: number, unit: Unit } {
  const normalizedUnit = unit.toLowerCase() as Unit
  
  // Weight
  if (normalizedUnit === 'g' && amount >= 1000) {
    return { amount: amount / 1000, unit: 'kg' };
  }
  if (normalizedUnit === 'kg') {
    return { amount: amount * 1000, unit: 'g' }
  }
  
  // Volume
  if (normalizedUnit === 'l') {
    return { amount: amount * 10, unit: 'dl' }
  }
  
  // Spoons
  if (normalizedUnit === 'ss') {
     // Rough estimate: 1 ss = 15ml = 0.15dl (approx) or just keep as ss/ts?
     // Usually better to keep ss/ts separate unless converting to weight (impossible without density).
     return { amount, unit: 'ss' }
  }
  if (normalizedUnit === 'ts') {
     return { amount, unit: 'ts' }
  }

  // Default
  return { amount, unit: normalizedUnit }
}

export function formatUnit(amount: number, unit: Unit): string {
  if (unit === 'g' && amount >= 1000) {
    return `${(amount / 1000).toFixed(1)} kg`
  }
  if (unit === 'dl' && amount >= 10) {
    return `${(amount / 10).toFixed(1)} l`
  }
  return `${amount} ${unit}`
}
