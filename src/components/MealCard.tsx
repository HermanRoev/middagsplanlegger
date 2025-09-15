'use client'

import Image from 'next/image'
import { Meal } from '@/types'

interface MealCardProps {
  meal: Meal
  onClick: () => void
  className?: string
}

export function MealCard({ meal, onClick, className }: MealCardProps) {
  return (
    <div
      className={`border border-gray-200 rounded-xl overflow-hidden group flex flex-col justify-between transition-all duration-200 bg-white shadow-sm hover:shadow-lg hover:scale-[1.02] cursor-pointer w-[220px] h-[180px] ${className}`}
      onClick={onClick}
    >
      <div className="mt-2 flex-grow flex flex-col items-center text-center w-full h-full justify-center px-4">
        {meal.imageUrl ? (
          <Image
            src={meal.imageUrl}
            alt={meal.name}
            width={160}
            height={100}
            className="w-full h-24 object-contain rounded-md mb-1"
          />
        ) : (
          <div className="w-full h-24 bg-gray-200 rounded-md flex items-center justify-center text-gray-400 text-sm p-2 text-center">
            <span>Bilde mangler</span>
          </div>
        )}
        <p className="text-sm font-medium text-gray-700 truncate w-full">
          {meal.name}
        </p>
        <div className="flex gap-4 text-sm text-gray-500 mt-1">
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
    </div>
  )
}
