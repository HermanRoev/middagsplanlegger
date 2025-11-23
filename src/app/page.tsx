import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-center p-6">
      <div className="max-w-3xl space-y-8">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-gray-900">
          Master Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Kitchen</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">
          The premium meal planner for the modern family. Smart imports, beautiful organization, and effortless shopping.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link href="/login">
            <Button size="lg" variant="premium" className="h-14 px-8 text-lg rounded-full">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2">
              Have an invite?
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
