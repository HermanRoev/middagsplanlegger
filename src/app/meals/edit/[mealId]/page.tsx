// Fil: src/app/meals/edit/[mealId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { MainLayout } from '@/components/MainLayout';
import { MealForm } from '@/components/MealForm';
import { Meal } from '@/types';

interface EditMealPageProps {
    params: {
        mealId: string;
    };
}

export default function EditMealPage({ params }: EditMealPageProps) {
    const router = useRouter();
    const { mealId } = params;
    const [initialData, setInitialData] = useState<Meal | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!mealId) return;

        const fetchMealData = async () => {
            const docRef = doc(db, 'meals', mealId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setInitialData({ id: docSnap.id, ...docSnap.data() } as Meal);
            } else {
                console.error("Ingen slik middag funnet!");
                // Håndter feil, f.eks. send brukeren tilbake
                router.push('/meals/browse');
            }
            setIsLoading(false);
        };

        fetchMealData();
    }, [mealId, router]);

    const handleUpdateMeal = async (mealData: Omit<Meal, 'id'>, imageFile: File | null) => {
        let imageUrl = mealData.imageUrl; // Start med eksisterende URL
        if (imageFile) {
            const storageRef = ref(storage, `meals/${Date.now()}_${imageFile.name}`);
            await uploadBytes(storageRef, imageFile);
            imageUrl = await getDownloadURL(storageRef);
        }

        const mealRef = doc(db, 'meals', mealId);
        await updateDoc(mealRef, {
            ...mealData,
            imageUrl,
        });

        // Legg til nye ingredienser i masterlisten
        for (const ingredient of mealData.ingredients) {
            await setDoc(doc(db, 'ingredients', ingredient.name), {});
        }

        alert(`Middagen '${mealData.name}' er oppdatert!`);
        router.push('/meals/browse');
    };

    if (isLoading) {
        return <MainLayout><p className="text-center">Laster middagsdata...</p></MainLayout>;
    }

    if (!initialData) {
        return <MainLayout><p className="text-center">Kunne ikke laste middagen.</p></MainLayout>;
    }

    return (
        <MainLayout>
            <MealForm onSave={handleUpdateMeal} initialData={initialData} isEditing={true} />
        </MainLayout>
    );
}