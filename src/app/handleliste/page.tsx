// Fil: src/app/handleliste/page.tsx
import { MainLayout } from '@/components/MainLayout';
import { ShoppingListView } from '@/components/ShoppingListView';

export default function ShoppingListPage() {
    return (
        <MainLayout>
            <ShoppingListView />
        </MainLayout>
    );
}