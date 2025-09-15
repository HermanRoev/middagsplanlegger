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
      className={`relative border border-gray-200 rounded-xl overflow-hidden group flex flex-col justify-between transition-all duration-200 bg-white shadow-sm hover:shadow-lg hover:scale-[1.02] cursor-pointer w-[220px] h-[220px] ${className}`}
      onClick={onClick}
    >
      <button
        onClick={handleFavoriteClick}
        className="absolute top-2 right-2 z-10 p-1.5 bg-white/70 backdrop-blur-sm rounded-full text-yellow-400 hover:text-yellow-500 hover:scale-110 transition-all"
        aria-label={isFavorite ? 'Fjern fra favoritter' : 'Legg til i favoritter'}
      >
        <span className="material-icons">
          {isFavorite ? 'star' : 'star_border'}
        </span>
      </button>

      <div className="flex-grow flex flex-col items-center text-center w-full h-full justify-center px-4 pt-8">
        {meal.imageUrl ? (
          <Image
            src={meal.imageUrl}
            alt={meal.name}
            width={160}
            height={100}
            className="w-full h-24 object-contain rounded-md mb-2"
          />
        ) : (
          <div className="w-full h-24 bg-gray-200 rounded-md flex items-center justify-center text-gray-400 text-sm p-2 text-center">
            <span>Bilde mangler</span>
          </div>
        )}
        <p className="text-sm font-medium text-gray-800 truncate w-full mt-2">
          {meal.name}
        </p>
      </div>

      <div className="p-3 bg-gray-50 border-t w-full">
        <div className="flex justify-center gap-4 text-xs text-gray-500">
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
        {meal.createdBy && (
          <p className="text-xs text-center text-gray-400 mt-2 truncate">
            Lagt til av: {meal.createdBy.name}
          </p>
        )}
      </div>
    </div>
  )
}
