import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Meal, PlannedMeal, CupboardItem } from '../../src/types';
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns';

export async function getUserRecipes(userId: string): Promise<Meal[]> {
  const recipesRef = collection(db, 'meals');
  const q = query(recipesRef, where('createdBy.id', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal));
}

export async function getRecipeById(recipeId: string): Promise<Meal | null> {
  const docRef = doc(db, 'meals', recipeId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Meal;
  }
  return null;
}

export async function getPlannedMeals(userId: string, date: Date): Promise<PlannedMeal[]> {
  const start = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const end = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const plannerRef = collection(db, 'plannedMeals');
  const q = query(
    plannerRef,
    where('plannedBy.id', '==', userId),
    where('date', '>=', start),
    where('date', '<=', end)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedMeal));
}

export async function getShoppingList(userId: string): Promise<{ planned: any[], manual: any[] }> {
  // Logic simplified for reading; complete implementation would involve
  // aggregating ingredients from planned meals vs cupboard stock.
  // For this "view-only" first pass, we might just list manual items or
  // rely on a stored shopping list if that's how the web app does it.

  // Checking memory: "The shopping list (/dashboard/shop) persists 'manual' items directly,
  // while 'planned' items (from recipes) are derived. The checked state of planned items
  // is persisted in a separate shoppingChecked Firestore collection."

  // Implementation note: Fully replicating the derived logic on mobile
  // without shared business logic code might be complex.
  // I will implement fetching manual items first.

  const shoppingRef = collection(db, 'shoppingList');
  const q = query(shoppingRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const manual = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return { planned: [], manual };
}
