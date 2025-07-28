// Fil: src/app/meals/browse/page.tsx
import { MainLayout } from '@/components/MainLayout';
import { BrowseMealsView } from '@/components/BrowseMealsView';

export default function BrowsePage() {
    return (
        <MainLayout>
            <BrowseMealsView />
        </MainLayout>
    );
}