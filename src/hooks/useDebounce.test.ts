import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce'

vi.useFakeTimers()

describe('useDebounce', () => {
  it('should return the initial value', () => {
    const { result } = renderHook(() => useDebounce('test', 500))
    expect(result.current).toBe('test')
  })

  it('should update the value after the specified delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'test', delay: 500 },
    })

    expect(result.current).toBe('test')

    rerender({ value: 'test2', delay: 500 })

    expect(result.current).toBe('test')

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('test2')
  })
})
