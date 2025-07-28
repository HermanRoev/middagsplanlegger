// src/hooks/useMeals.ts
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Meal } from '@/types';
import toast from 'react-hot-toast';

export function useMeals() {
    const [meals, setMeals] = useState<Meal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMeals = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const mealsQuery = query(collection(db, 'meals'), orderBy('name'));
            const querySnapshot = await getDocs(mealsQuery);
            const mealsData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name || 'Unnamed Meal',
                    imageUrl: data.imageUrl || '',
                    servings: data.servings || 1,
                    ingredients: data.ingredients || [],
                    instructions: data.instructions || '',
                    prepTime: data.prepTime || 0,
                    costEstimate: data.costEstimate || 0,
                } as Meal;
            });
            setMeals(mealsData);
        } catch (error) {
            console.error('Error fetching meals:', error);
            const errorMessage = error instanceof Error 
                ? error.message 
                : 'Det oppstod en feil ved henting av middager';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMeals();
    }, []);

    return { meals, isLoading, error, refetch: fetchMeals };
}