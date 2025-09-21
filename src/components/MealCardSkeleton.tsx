import { Skeleton } from './ui/Skeleton'

export function MealCardSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden bg-white shadow-md flex flex-col">
      {/* Image Placeholder */}
      <Skeleton className="h-40 w-full" />

      {/* Content Placeholder */}
      <div className="p-4 flex-grow flex flex-col">
        {/* Title Placeholder */}
        <Skeleton className="h-6 w-3/4 mb-4" />

        {/* Spacer */}
        <div className="flex-grow"></div>

        {/* Meta Info Placeholders */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* Creator Placeholder */}
        <Skeleton className="h-3 w-1/2 mt-4" />
      </div>
    </div>
  )
}
