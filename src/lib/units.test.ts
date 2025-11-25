import { expect, test } from 'vitest'
import { normalizeUnit } from './units'

test('normalizeUnit', () => {
  const res = normalizeUnit(1000, 'g')
  expect(res.amount).toBe(1)
  expect(res.unit).toBe('kg')

  const res2 = normalizeUnit(500, 'g')
  expect(res2.amount).toBe(0.5)
  expect(res2.unit).toBe('kg')
})
