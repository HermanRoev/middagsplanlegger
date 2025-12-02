import { Suspense } from "react";
import RecipesContent from "./RecipesContent";

export default function RecipesPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <RecipesContent />
    </Suspense>
  )
}
