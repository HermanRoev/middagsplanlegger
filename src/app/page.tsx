import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PageLayout, PageContainer } from "@/components/layout/PageLayout"
import { Heading, GradientText, Text } from "@/components/ui/typography"

export default function LandingPage() {
  return (
    <PageLayout variant="gradient" align="center">
      <PageContainer size="sm" className="space-y-8 text-center">
        <Heading level="h1">
          Master Your <GradientText>Kitchen</GradientText>
        </Heading>
        <Text size="xl" className="max-w-2xl mx-auto">
          The premium meal planner for the modern family. Smart imports, beautiful organization, and effortless shopping.
        </Text>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link href="/login">
            <Button size="xl" variant="premium" shape="pill">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="xl" variant="outline" shape="pill">
              Have an invite?
            </Button>
          </Link>
        </div>
      </PageContainer>
    </PageLayout>
  )
}
