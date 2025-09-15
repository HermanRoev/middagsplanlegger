// src/components/ui/MealInfoBadge.tsx

interface MealInfoBadgeProps {
  prepTime: number | null
  costEstimate: number | null
  size?: 'sm' | 'base'
  className?: string
}

export function MealInfoBadge({
  prepTime,
  costEstimate,
  size = 'sm',
  className = '',
}: MealInfoBadgeProps) {
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const iconSize = size === 'sm' ? 'text-sm' : 'text-base'

  const hasContent = (prepTime ?? 0) > 0 || (costEstimate ?? 0) > 0

  if (!hasContent) {
    return null
  }

  return (
    <div className={`flex gap-4 text-gray-500 ${textSize} ${className}`}>
      {(prepTime ?? 0) > 0 && (
        <span className="flex items-center gap-1">
          <span className={`material-icons ${iconSize}`}>schedule</span>
          {prepTime} min
        </span>
      )}
      {(costEstimate ?? 0) > 0 && (
        <span className="flex items-center gap-1">
          <span className={`material-icons ${iconSize}`}>payments</span>
          {costEstimate} kr
        </span>
      )}
    </div>
  )
}
