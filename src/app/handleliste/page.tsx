// Fil: src/app/handleliste/page.tsx
import { MainLayout } from '@/components/MainLayout'
import { ShoppingListView } from '@/components/ShoppingListView'

export const dynamic = 'force-dynamic'

export default function ShoppingListPage() {
  return (
    <MainLayout>
      <ShoppingListView />
    </MainLayout>
  )
}
