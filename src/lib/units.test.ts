import { normalizeUnit, formatUnit } from './units'

test('normalizeUnit converts g to kg at 1000g', () => {
  const res = normalizeUnit(1000, 'g')
  expect(res.amount).toBe(1)
  expect(res.unit).toBe('kg')
})

test('normalizeUnit converts kg to g', () => {
  const res = normalizeUnit(2, 'kg')
  expect(res.amount).toBe(2000)
  expect(res.unit).toBe('g')
})

test('normalizeUnit converts l to dl', () => {
  const res = normalizeUnit(1.5, 'l')
  expect(res.amount).toBe(15)
  expect(res.unit).toBe('dl')
})

test('formatUnit formats g to kg string', () => {
  expect(formatUnit(1200, 'g')).toBe('1.2 kg')
})

test('formatUnit formats dl to l string', () => {
  expect(formatUnit(12, 'dl')).toBe('1.2 l')
})

test('formatUnit returns base unit for small values', () => {
  expect(formatUnit(2, 'stk')).toBe('2 stk')
})
