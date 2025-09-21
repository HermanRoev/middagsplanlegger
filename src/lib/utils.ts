import { Ingredient } from '@/types'

export function normalizeIngredient(ing: Ingredient): {
  name: string
  amount: number
  unit: string
  key: string
} {
  let baseAmount = ing.amount || 0
  let baseUnit = ing.unit as string
  let keySuffix = baseUnit

  if (ing.unit === 'kg') {
    baseAmount *= 1000
    baseUnit = 'g'
  } else if (ing.unit === 'l') {
    baseAmount *= 10
    baseUnit = 'dl'
  } else if (ing.unit === 'ss') {
    baseAmount *= 3
    baseUnit = 'ts'
  }

  if (['g', 'kg'].includes(ing.unit)) keySuffix = 'g'
  if (['dl', 'l'].includes(ing.unit)) keySuffix = 'dl'
  if (['ts', 'ss'].includes(ing.unit)) keySuffix = 'ts'

  const key = `${ing.name.trim().toLowerCase()}_${keySuffix}`

  return {
    name: ing.name.trim(),
    amount: baseAmount,
    unit: baseUnit,
    key,
  }
}
