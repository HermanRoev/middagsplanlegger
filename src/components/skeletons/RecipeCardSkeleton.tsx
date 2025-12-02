import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

export function RecipeCardSkeleton() {
  return (
    <Card data-testid="recipe-card-skeleton" className="h-full flex flex-col overflow-hidden border-0 bg-white">
      <div className="aspect-video bg-gray-100 relative">
        <Skeleton className="w-full h-full" />
      </div>

      <CardContent className="p-4 flex-1">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 gap-2">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  )
}
