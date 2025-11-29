import { normalizeUnit } from './units'

test('normalizeUnit', () => {
  const res = normalizeUnit(1000, 'g')
  expect(res.amount).toBe(1)
  expect(res.unit).toBe('kg')
})
