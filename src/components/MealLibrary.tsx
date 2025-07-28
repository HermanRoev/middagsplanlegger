// Fil: src/components/MealLibrary.tsx
'use client';

import { useState, useEffect } from 'react';
import { useMeals } from '@/hooks/useMeals';
import { Meal } from '@/types';
import { Skeleton } from './ui/Skeleton';
import Image from 'next/image';

interface MealLibraryProps {
    onSelectMeal: (meal: Meal) => void;
    cardClassName?: string;
}

export function MealLibrary({ onSelectMeal }: MealLibraryProps) {
    const { meals: allMeals, isLoading } = useMeals();
    const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const results = allMeals.filter(meal =>
            meal.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredMeals(results);
    }, [searchTerm, allMeals]);

    return (
        <div className="bg-white p-8 rounded-xl shadow-xl w-full">
            <div className="mb-6">
                <div role="search">
                    <label htmlFor="meal-search" className="sr-only">Søk etter middag</label>
                    <input
                        id="meal-search"
                        type="search"
                        placeholder="Søk etter middag..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-[360px] px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        aria-label="Søk etter middag"
                    />
                </div>
            </div>
            {isLoading ? (
                <div className="flex flex-wrap gap-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden group flex flex-col justify-between transition-all duration-200 bg-white shadow-sm w-[220px] h-[180px]">
                            <div className="mt-2 flex-grow flex flex-col items-center text-center w-full h-full justify-center px-4">
                                <Skeleton className="w-full h-24 rounded-md mb-1" />
                                <Skeleton className="h-6 w-3/4 mt-2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="flex flex-wrap gap-4">
                     {filteredMeals.map(meal => (
                         <div
                             key={meal.id}
                             className="border border-gray-200 rounded-xl overflow-hidden group flex flex-col justify-between transition-all duration-200 bg-white shadow-sm hover:shadow-lg hover:scale-[1.02] cursor-pointer w-[220px] h-[180px]"
                             onClick={() => onSelectMeal(meal)}
                         >
                             <div className="mt-2 flex-grow flex flex-col items-center text-center w-full h-full justify-center px-4">
                                 {meal.imageUrl ? (
                                     <Image
                                         src={meal.imageUrl}
                                         alt={meal.name}
                                         width={160}
                                         height={100}
                                         unoptimized={true}
                                         className="w-full h-24 object-cover rounded-md mb-1"
                                     />
                                 ) : (
                                     <div className="w-full h-24 bg-gray-200 rounded-md flex items-center justify-center text-gray-400 text-sm p-2 text-center">
                                         <span>Bilde mangler</span>
                                     </div>
                                 )}
                                 <p className="text-sm font-medium text-gray-700 truncate w-full">{meal.name}</p>
                                 <div className="flex gap-4 text-xs text-gray-500 mt-1">
                                     {(meal.prepTime ?? 0) > 0 && (
                                         <span className="flex items-center gap-1">
                                             <span className="material-icons text-sm">schedule</span>
                                             {meal.prepTime} min
                                         </span>
                                     )}
                                     {(meal.costEstimate ?? 0) > 0 && (
                                         <span className="flex items-center gap-1">
                                             <span className="material-icons text-sm">payments</span>
                                             {meal.costEstimate} kr
                                         </span>
                                     )}
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
            )}
            {filteredMeals.length === 0 && !isLoading && (
                <p className="text-center text-gray-500">Ingen middager funnet som passer søket.</p>
            )}
        </div>
    );
}