import { MainLayout } from '@/components/MainLayout'
import { CupboardView } from '@/components/CupboardView'

export const dynamic = 'force-dynamic'

export default function CupboardPage() {
  return (
    <MainLayout>
      <CupboardView />
    </MainLayout>
  )
}
