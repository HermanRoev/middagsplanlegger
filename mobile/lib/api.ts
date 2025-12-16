import { collection, getDocs, query, where, orderBy, doc, getDoc, addDoc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from './firebase';
import { Meal, PlannedMeal, Suggestion } from '../../src/types';
import { startOfWeek, endOfWeek, format, addDays } from 'date-fns';

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
  // Fetch manual items
  const shoppingRef = collection(db, 'shoppingList');
  const q = query(shoppingRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const manual = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Fetch planned meals for the current week (next 7 days from today to cover immediate needs)
  // or align with the standard "Weekly Planner" view which is current week.
  // We'll use the current week logic to match getPlannedMeals
  const today = new Date();
  const plannedMeals = await getPlannedMeals(userId, today);

  // Aggregate ingredients
  // Note: This is a simplified aggregation. The full web version might handle scaling and checked items differently.
  // We also need to fetch the 'shoppingChecked' state if we want to show what's already bought.

  // Fetch checked status
  const checkedRef = collection(db, 'shoppingChecked');
  const checkedQ = query(checkedRef, where('userId', '==', userId));
  const checkedSnap = await getDocs(checkedQ);
  const checkedIds = new Set(checkedSnap.docs.map(doc => doc.data().ingredientId || doc.id)); // Assuming ID usage

  const planned = plannedMeals.flatMap(meal => {
      // Use scaledIngredients if available (from planner scaling), else fallback to ingredients
      const ingredients = meal.scaledIngredients || meal.ingredients || [];
      return ingredients.map(ing => ({
          ...ing,
          mealId: meal.id,
          mealName: meal.mealName,
          checked: false // We can't easily map the "checked" state without a composite ID of mealId + ingredientName or similar
          // Real implementation requires robust ID generation for ingredients in planned meals.
      }));
  });

  return { planned, manual };
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
