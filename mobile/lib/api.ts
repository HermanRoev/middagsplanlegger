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

export async function updateMeal(id: string, updates: Partial<Meal>): Promise<void> {
    const mealRef = doc(db, 'meals', id);
    await updateDoc(mealRef, {
        ...updates,
        updatedAt: new Date().toISOString()
    });
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

export async function addPlannedMeal(userId: string, meal: Meal, date: string): Promise<void> {
    const plannerRef = collection(db, 'plannedMeals');
    await addDoc(plannerRef, {
        date,
        mealId: meal.id,
        mealName: meal.name,
        imageUrl: meal.imageUrl || null,
        plannedServings: meal.servings || 4,
        isShopped: false,
        isCooked: false,
        ingredients: meal.ingredients || [],
        scaledIngredients: meal.ingredients || [],
        instructions: meal.instructions || [],
        prepTime: meal.prepTime,
        plannedBy: { id: userId, name: 'User' },
        createdAt: new Date().toISOString()
    });
}

export async function addLeftoverMeal(userId: string, date: string): Promise<void> {
    const plannerRef = collection(db, 'plannedMeals');
    await addDoc(plannerRef, {
        date,
        mealId: "leftover-placeholder",
        mealName: "Leftovers",
        imageUrl: null,
        plannedServings: 4,
        isShopped: true,
        isCooked: false,
        ingredients: [],
        notes: "Eat up previous meals!",
        plannedBy: { id: userId, name: 'User' },
        createdAt: new Date().toISOString()
    });
}

export async function getShoppingList(userId: string): Promise<{ planned: any[], manual: any[] }> {
  // Fetch manual items
  const shoppingRef = collection(db, 'shoppingList');
  const q = query(shoppingRef, where('userId', '==', userId));
  // FIX: Remove userId filter for manual items to match web behavior (or lack thereof).
  const snapshot = await getDocs(shoppingRef);
  const manual = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Fetch planned meals
  const today = new Date();
  const plannedMeals = await getPlannedMeals(userId, today);

  // Fetch checked status for planned items
  const checkedRef = collection(db, 'shoppingChecked');
  const checkedQ = query(checkedRef);
  const checkedSnap = await getDocs(checkedQ);
  const checkedMap: Record<string, boolean> = {};
  checkedSnap.docs.forEach(doc => {
      checkedMap[doc.id] = doc.data().checked;
  });

  const planned = plannedMeals.flatMap(meal => {
      const ingredients = meal.scaledIngredients || meal.ingredients || [];
      return ingredients.map(ing => {
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

export async function addSuggestion(text: string, userId: string, userName: string, forDate?: string): Promise<void> {
    const suggestionsRef = collection(db, 'suggestions');
    const data: any = {
        text,
        votes: 1,
        votedBy: [userId],
        status: 'pending',
        suggestedBy: {
            id: userId,
            name: userName
        },
        createdAt: new Date().toISOString()
    };

    if (forDate) {
        data.forDate = forDate;
    }

    await addDoc(suggestionsRef, data);
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
