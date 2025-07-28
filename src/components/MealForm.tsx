// Fil: src/components/MealForm.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Ingredient, Meal } from '@/types';

// Enhetene for nedtrekksmenyen
const units = [
    { value: 'g', label: 'gram' }, { value: 'kg', label: 'kg' },
    { value: 'l', label: 'liter' }, { value: 'dl', label: 'dl' },
    { value: 'stk', label: 'stk' }, { value: 'ts', label: 'ts' },
    { value: 'ss', label: 'ss' },
];

// Definerer props for komponenten
interface MealFormProps {
    initialData?: Meal;
    onSave: (mealData: Omit<Meal, 'id'>, imageFile: File | null) => Promise<void>;
    isEditing: boolean;
}

export function MealForm({ initialData, onSave, isEditing }: MealFormProps) {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState(initialData?.imageUrl || '');
    const [mealName, setMealName] = useState(initialData?.name || '');
    const [servings, setServings] = useState(initialData?.servings || 1);
    const [prepTime, setPrepTime] = useState(initialData?.prepTime || 0);
    const [costEstimate, setCostEstimate] = useState(initialData?.costEstimate || 0);
    const [instructions, setInstructions] = useState(initialData?.instructions || '');
    const [ingredients, setIngredients] = useState<Ingredient[]>(initialData?.ingredients || []);
    const [masterIngredientList, setMasterIngredientList] = useState<string[]>([]);

    // For pasting images
    const pasteInputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch master ingredients list
        const fetchMasterIngredients = async () => {
            const querySnapshot = await getDocs(collection(db, 'ingredients'));
            setMasterIngredientList(querySnapshot.docs.map(doc => doc.id));
        };
        fetchMasterIngredients();
    }, []);

    const handleFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        } else {
            alert("Vennligst velg en gyldig bildefil.");
        }
    };

    // KORRIGERT: useEffect for "paste" er nå inkludert og komplett
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) handleFile(file);
                    break;
                }
            }
        };

        const div = pasteInputRef.current;
        if (div) {
            div.addEventListener('paste', handlePaste);
            return () => div.removeEventListener('paste', handlePaste);
        }
    }, []);

    const addIngredient = () => {
        setIngredients([...ingredients, { name: '', amount: 0, unit: 'stk' }]);
    };

    const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
        const newIngredients = [...ingredients];
        newIngredients[index] = { ...newIngredients[index], [field]: value };
        setIngredients(newIngredients);
    };

    const removeIngredient = (index: number) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mealName) {
            alert("Vennligst fyll inn navn på middagen");
            return;
        }
        if (ingredients.length === 0) {
            alert("Legg til minst én ingrediens");
            return;
        }

        const mealData: Omit<Meal, 'id'> = {
            name: mealName,
            servings,
            prepTime,
            costEstimate,
            ingredients: ingredients.filter(ing => ing.name.trim() !== ''),
            instructions,
            imageUrl: initialData?.imageUrl || ''
        };

        await onSave(mealData, imageFile);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div ref={pasteInputRef} className="space-y-6">
                <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 cursor-pointer" onClick={() => document.getElementById('imageInput')?.click()}>
                    <input
                        type="file"
                        id="imageInput"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                    {imagePreview ? (
                        <Image src={imagePreview} alt="Preview" width={300} height={200} unoptimized={true} className="rounded-lg object-cover" />
                    ) : (
                        <div className="text-center">
                            <span className="material-icons text-4xl text-gray-400">image</span>
                            <p className="text-sm text-gray-500 mt-2">Klikk for å velge bilde, dra og slipp, eller lim inn</p>
                        </div>
                    )}
                </div>

                <div className="mb-6">
                    <label htmlFor="mealName" className="block mb-2 text-sm font-medium text-gray-700">
                        Navn på middag
                    </label>
                    <input
                        type="text"
                        id="mealName"
                        value={mealName}
                        onChange={(e) => setMealName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label htmlFor="servings" className="block mb-2 text-sm font-medium text-gray-700">
                            Antall porsjoner
                        </label>
                        <input
                            type="number"
                            id="servings"
                            value={servings}
                            onChange={(e) => setServings(Number(e.target.value))}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <div>
                        <label htmlFor="prepTime" className="block mb-2 text-sm font-medium text-gray-700">
                            Tilberedningstid (minutter)
                        </label>
                        <input
                            type="number"
                            id="prepTime"
                            value={prepTime}
                            onChange={(e) => setPrepTime(Number(e.target.value))}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <div>
                        <label htmlFor="costEstimate" className="block mb-2 text-sm font-medium text-gray-700">
                            Estimert kostnad (NOK)
                        </label>
                        <input
                            type="number"
                            id="costEstimate"
                            value={costEstimate}
                            onChange={(e) => setCostEstimate(Number(e.target.value))}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                        Ingredienser
                    </label>
                    <div className="space-y-2">
                        {ingredients.map((ingredient, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={ingredient.name}
                                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                                    placeholder="Ingrediens"
                                    list="ingredients"
                                    className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                    type="number"
                                    value={ingredient.amount}
                                    onChange={(e) => updateIngredient(index, 'amount', Number(e.target.value))}
                                    placeholder="Mengde"
                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <select
                                    value={ingredient.unit}
                                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    {units.map(unit => (
                                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => removeIngredient(index)}
                                    className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                >
                                    <span className="material-icons">delete</span>
                                </button>
                            </div>
                        ))}
                        <datalist id="ingredients">
                            {masterIngredientList.map(ingredient => (
                                <option key={ingredient} value={ingredient} />
                            ))}
                        </datalist>
                    </div>
                    <button
                        type="button"
                        onClick={addIngredient}
                        className="mt-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                    >
                        <span className="material-icons">add</span>
                        Legg til ingrediens
                    </button>
                </div>

                <div className="mb-6">
                    <label htmlFor="instructions" className="block mb-2 text-sm font-medium text-gray-700">
                        Fremgangsmåte
                    </label>
                    <textarea
                        id="instructions"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <Link href="/" className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                    Avbryt
                </Link>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isEditing ? 'Oppdater' : 'Lagre'} middag
                </button>
            </div>
        </form>
    );
}
