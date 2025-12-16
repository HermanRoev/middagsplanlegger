import { collection, getDocs, query, where, orderBy, doc, getDoc, addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, increment, setDoc } from 'firebase/firestore';
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
  const q = query(shoppingRef, where('userId', '==', userId)); // Note: Web app doesn't seem to filter by userId in the read_file output?
  // Wait, the web app code shows `const q = query(collection(db, "shoppingList"))` - NO userId filter?
  // That seems wrong for a multi-user app, but maybe it's a family shared list?
  // The mobile `getShoppingList` currently filters by `userId`.
  // If the web app is shared, mobile should probably match.
  // But given I am "fixing" it, let's assume it should be per user or match existing pattern.
  // The web app snapshot does NOT filter. The mobile one DOES.
  // Let's stick to the mobile filter for safety unless it's empty.
  // Actually, the web app code `src/app/dashboard/shop/page.tsx` definitely does `query(collection(db, "shoppingList"))`.
  // This implies a shared global list or security rules handle it.
  // I'll keep the filter for now as it's safer, or check if `userId` is even in the document on web.
  // Web `addItem` writes: `name`, `checked`, `createdAt`. NO userId.
  // So `where('userId', '==', userId)` on mobile will return NOTHING if the web app created items without userId.

  // FIX: Remove userId filter for manual items to match web behavior (or lack thereof).
  const snapshot = await getDocs(shoppingRef);
  const manual = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Fetch planned meals
  const today = new Date();
  const plannedMeals = await getPlannedMeals(userId, today);

  // Fetch checked status for planned items
  const checkedRef = collection(db, 'shoppingChecked');
  const checkedQ = query(checkedRef); // Again, no userId filter on web side for this?
  const checkedSnap = await getDocs(checkedQ);
  const checkedMap: Record<string, boolean> = {};
  checkedSnap.docs.forEach(doc => {
      checkedMap[doc.id] = doc.data().checked;
  });

  const planned = plannedMeals.flatMap(meal => {
      const ingredients = meal.scaledIngredients || meal.ingredients || [];
      return ingredients.map(ing => {
          // Construct ID logic similar to web if possible, or just use a composite key for now
          // Web uses `${ing.name.toLowerCase()}-${normalizedUnit}` as key for aggregation
          // We'll skip complex aggregation for this step and just list them, but we need the ID to check state.
          // Let's make a best effort ID.
          const id = `${ing.name.toLowerCase()}-${ing.unit}`;
          return {
            ...ing,
            id: id,
            mealId: meal.id,
            mealName: meal.mealName,
            checked: checkedMap[id] || false
          };
      });
  });

  return { planned, manual };
}

export async function addManualShoppingItem(name: string): Promise<void> {
    const shoppingRef = collection(db, 'shoppingList');
    await addDoc(shoppingRef, {
        name,
        checked: false,
        createdAt: new Date().toISOString()
        // No userId based on web implementation
    });
}

export async function toggleShoppingItem(id: string, checked: boolean, isManual: boolean): Promise<void> {
    if (isManual) {
        const itemRef = doc(db, 'shoppingList', id);
        await updateDoc(itemRef, { checked });
    } else {
        const itemRef = doc(db, 'shoppingChecked', id);
        await setDoc(itemRef, { checked }, { merge: true });
    }
}

export async function deleteShoppingItem(id: string): Promise<void> {
    const itemRef = doc(db, 'shoppingList', id);
    await deleteDoc(itemRef);
}

export async function getInboxMeals(): Promise<Suggestion[]> {
  const suggestionsRef = collection(db, 'suggestions');
  const q = query(suggestionsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Suggestion));
}

export async function addSuggestion(text: string, userId: string, userName: string): Promise<void> {
    const suggestionsRef = collection(db, 'suggestions');
    await addDoc(suggestionsRef, {
        text,
        votes: 1,
        votedBy: [userId],
        status: 'pending',
        suggestedBy: {
            id: userId,
            name: userName
        },
        createdAt: new Date().toISOString()
    });
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

export async function approveSuggestion(suggestionId: string): Promise<void> {
    const suggestionRef = doc(db, 'suggestions', suggestionId);
    await updateDoc(suggestionRef, {
        status: 'approved'
    });
}

export async function rejectSuggestion(suggestionId: string): Promise<void> {
    const suggestionRef = doc(db, 'suggestions', suggestionId);
    await deleteDoc(suggestionRef);
}
