'use client'

import Image from 'next/image'
import { Meal } from '@/types'

interface MealCardProps {
  meal: Meal
  onClick: () => void
  className?: string
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function MealCard({
  meal,
  onClick,
  className,
  isFavorite,
  onToggleFavorite,
}: MealCardProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite()
  }

  return (
    <div
      className={`rounded-lg overflow-hidden group transition-all duration-300 bg-white shadow-md hover:shadow-xl w-[240px] flex flex-col cursor-pointer ${className}`}
      onClick={onClick}
      data-testid="meal-card"
    >
      {/* Image Container */}
      <div className="relative h-40 w-full">
        {meal.imageUrl ? (
          <Image
            src={meal.imageUrl}
            alt={meal.name}
            layout="fill"
            objectFit="cover"
            className=""
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
            <span className="material-icons text-4xl">image</span>
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-yellow-500 hover:text-yellow-400 hover:scale-110 transition-all"
          aria-label={
            isFavorite ? 'Fjern fra favoritter' : 'Legg til i favoritter'
          }
        >
          <span className="material-icons">
            {isFavorite ? 'star' : 'star_border'}
          </span>
        </button>
      </div>

      {/* Content Container */}
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-semibold text-lg text-gray-800 truncate">
          {meal.name}
        </h3>

        <div className="flex-grow"></div>

        <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
          <div className="flex items-center gap-4">
            {(meal.prepTime ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <span className="material-icons text-base">schedule</span>
                {meal.prepTime} min
              </span>
            )}
            {(meal.costEstimate ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <span className="material-icons text-base">payments</span>
                {meal.costEstimate} kr
              </span>
            )}
          </div>
        </div>

        {meal.createdBy && (
          <p className="text-xs text-gray-400 mt-3 truncate">
            Av: {meal.createdBy.name}
          </p>
        )}
      </div>
    </div>
  )
}
