import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PageLayout, PageContainer } from "@/components/layout/PageLayout"
import { Heading, GradientText, Text } from "@/components/ui/typography"

export default function LandingPage() {
  return (
    <PageLayout variant="gradient" align="center">
      <PageContainer size="sm" className="space-y-8 text-center">
        <Heading level="h1">
          Mestre Ditt <GradientText>Kjøkken</GradientText>
        </Heading>
        <Text size="xl" className="max-w-2xl mx-auto">
          Den ultimate måltidsplanleggeren for den moderne familien. Smart import, vakker organisering og uanstrengt handling.
        </Text>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link href="/login">
            <Button size="xl" variant="premium" shape="pill">
              Logg inn
            </Button>
          </Link>
          <Link href="/register">
            <Button size="xl" variant="outline" shape="pill">
              Har du en invitasjon?
            </Button>
          </Link>
        </div>
      </PageContainer>
    </PageLayout>
  )
}
