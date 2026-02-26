"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"

const RecipeDetailsClient = dynamic(
  () => import("./RecipeDetailsClient"),
  { ssr: false }
)

export default function RecipeViewPage() {
  return (
    <Suspense>
      <RecipeDetailsClient />
    </Suspense>
  )
}
