import { collection, getDocs, query, where, orderBy, doc, getDoc, addDoc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from './firebase';
import { Meal, PlannedMeal, Suggestion } from '../../src/types';
import { startOfWeek, endOfWeek, format } from 'date-fns';

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

export async function createMeal(meal: Omit<Meal, 'id'>): Promise<string> {
  const recipesRef = collection(db, 'meals');
  const docRef = await addDoc(recipesRef, {
    ...meal,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return docRef.id;
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
  const shoppingRef = collection(db, 'shoppingList');
  const q = query(shoppingRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const manual = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return { planned: [], manual };
}

export async function getInboxMeals(): Promise<Suggestion[]> {
  const suggestionsRef = collection(db, 'suggestions');
  const q = query(suggestionsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Suggestion));
}

export async function voteForMeal(suggestionId: string, userId: string, vote: boolean): Promise<void> {
  const suggestionRef = doc(db, 'suggestions', suggestionId);
  if (vote) {
    await updateDoc(suggestionRef, {
      votedBy: arrayUnion(userId),
      votes: increment(1)
    });
  } else {
    await updateDoc(suggestionRef, {
      votedBy: arrayRemove(userId),
      votes: increment(-1)
    });
  }
}
