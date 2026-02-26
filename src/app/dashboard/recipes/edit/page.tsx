"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"

const EditRecipeClient = dynamic(
  () => import("./EditRecipeClient"),
  { ssr: false }
)

export default function RecipeEditPage() {
  return (
    <Suspense>
      <EditRecipeClient />
    </Suspense>
  )
}
