import { collection, getDocs, query, where, orderBy, doc, getDoc, addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, increment, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Meal, PlannedMeal, Suggestion, CupboardItem } from '../../src/types';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export async function getUserRecipes(userId: string, householdId: string): Promise<Meal[]> {
  const recipesRef = collection(db, 'meals');
  const q = query(recipesRef, where('householdId', '==', householdId));
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

export async function getCupboardItems(userId: string, householdId: string): Promise<CupboardItem[]> {
  const cupboardRef = collection(db, 'cupboard');
  const q = query(cupboardRef, where('householdId', '==', householdId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CupboardItem));
}

export async function createMeal(meal: Omit<Meal, 'id'>, householdId: string): Promise<string> {
  const recipesRef = collection(db, 'meals');
  const docRef = await addDoc(recipesRef, {
    ...meal,
    householdId: householdId,
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

export async function getPlannedMeals(userId: string, date: Date, householdId: string): Promise<PlannedMeal[]> {
  const start = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const end = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const plannerRef = collection(db, 'plannedMeals');
  const q = query(
    plannerRef,
    where('householdId', '==', householdId),
    where('date', '>=', start),
    where('date', '<=', end)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlannedMeal));
}

export async function getPlannedMealById(plannedId: string): Promise<PlannedMeal | null> {
  const docRef = doc(db, 'plannedMeals', plannedId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as PlannedMeal;
  }
  return null;
}

export async function addPlannedMeal(userId: string, meal: Meal, date: string, householdId: string): Promise<void> {
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
    plannedBy: { id: userId, name: 'Bruker' },
    householdId: householdId,
    createdAt: new Date().toISOString()
  });
}

export async function addLeftoverMeal(userId: string, date: string, householdId: string): Promise<void> {
  const plannerRef = collection(db, 'plannedMeals');
  await addDoc(plannerRef, {
    date,
    mealId: "leftover-placeholder",
    mealName: "Rester",
    imageUrl: null,
    plannedServings: 4,
    isShopped: true,
    isCooked: false,
    ingredients: [],
    notes: "Spis opp tidligere måltider!",
    plannedBy: { id: userId, name: 'Bruker' },
    householdId: householdId,
    createdAt: new Date().toISOString()
  });
}

export async function updatePlannedMeal(id: string, updates: Partial<PlannedMeal>): Promise<void> {
  const plannerRef = doc(db, 'plannedMeals', id);
  await updateDoc(plannerRef, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
}

export async function deletePlannedMeal(id: string): Promise<void> {
  const plannerRef = doc(db, 'plannedMeals', id);
  await deleteDoc(plannerRef);
}

export async function deleteRecipe(id: string): Promise<void> {
  await deleteDoc(doc(db, 'meals', id));

  const plannedRef = collection(db, 'plannedMeals');
  const q = query(plannedRef, where('mealId', '==', id));
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

export async function getShoppingList(userId: string, householdId: string): Promise<{ planned: { id: string, name: string, amount: number, unit: string, mealId: string, mealName: string, checked: boolean }[], manual: { id: string, name?: string, item?: string, checked?: boolean }[] }> {
  // Fetch manual items
  const shoppingRef = collection(db, 'shoppingList');
  const snapshot = await getDocs(query(shoppingRef, where('householdId', '==', householdId)));
  const manual = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Fetch Cupboard Items
  const cupboardRef = collection(db, 'cupboard');
  const cupboardSnap = await getDocs(query(cupboardRef, where('householdId', '==', householdId)));
  const cupboardNames = cupboardSnap.docs.map(doc => doc.data().ingredientName?.toLowerCase() || "");

  // Fetch planned meals
  const today = new Date();
  const plannedMeals = await getPlannedMeals(userId, today, householdId);

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
    return ingredients
      .filter((ing: any) => {
        if (ing.isShopped || !ing.amount || !ing.unit) return false;
        // Exclude if already in cupboard
        if (cupboardNames.includes(ing.name?.toLowerCase())) return false;
        return true;
      })
      .map((ing: any) => {
        const id = `${ing.name.toLowerCase()}-${ing.unit}`;
        return {
          ...ing,
          amount: ing.amount || 0,
          id: id,
          mealId: meal.id,
          mealName: meal.mealName,
          checked: checkedMap[id] || false
        };
      });
  });

  return { planned, manual };
}

export async function addManualShoppingItem(name: string, householdId: string): Promise<void> {
  const shoppingRef = collection(db, 'shoppingList');
  await addDoc(shoppingRef, {
    name,
    checked: false,
    householdId: householdId,
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

export async function clearCheckedItems(userId: string, householdId: string): Promise<void> {
  const shoppingRef = collection(db, 'shoppingList');
  const q = query(shoppingRef, where('checked', '==', true), where('householdId', '==', householdId));
  const snapshot = await getDocs(q);

  const checkedRef = collection(db, 'shoppingChecked');
  const checkedSnap = await getDocs(checkedRef);
  const checkedPlannedKeys = checkedSnap.docs
    .filter(doc => doc.data().checked)
    .map(doc => doc.id);

  // 1. Move to Cupboard First
  const moveToCupboardPromises: Promise<any>[] = [];

  // Manual items
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.name) {
      moveToCupboardPromises.push(addDoc(collection(db, 'cupboard'), {
        ingredientName: data.name.toLowerCase(),
        amount: null,
        unit: 'stk',
        userId: userId,
        householdId: householdId,
        wantedAmount: null,
        threshold: null
      }));
    }
  });

  // Planned items are trickier because shoppingChecked only has the ID (name-unit).
  // We extract the name and unit from the ID.
  checkedPlannedKeys.forEach(key => {
    const parts = key.split('-');
    if (parts.length > 0) {
      const name = parts[0];
      const unit = parts.length > 1 ? parts.slice(1).join('-') : 'stk';
      moveToCupboardPromises.push(addDoc(collection(db, 'cupboard'), {
        ingredientName: name.toLowerCase(),
        amount: null,
        unit: unit,
        userId: userId,
        householdId: householdId,
        wantedAmount: null,
        threshold: null
      }));
    }
  });

  await Promise.all(moveToCupboardPromises);

  // 2. Delete Manual Items
  const manualPromises = snapshot.docs.map(doc => deleteDoc(doc.ref));

  // 3. Update Planned Meals 'isShopped' flag
  if (checkedPlannedKeys.length > 0) {
    const mealsQ = query(collection(db, "plannedMeals"), where("isShopped", "==", false), where('householdId', '==', householdId));
    const mealsSnap = await getDocs(mealsQ);

    const updatePromises = mealsSnap.docs.map(mealDoc => {
      const meal = mealDoc.data();
      let updated = false;

      const processIngredients = (ings: any[] | undefined) => {
        if (!ings) return ings;
        return ings.map(ing => {
          if (ing.isShopped || !ing.amount || !ing.unit) return ing;
          const id = `${ing.name.toLowerCase()}-${ing.unit}`;
          if (checkedPlannedKeys.includes(id)) {
            updated = true;
            return { ...ing, isShopped: true };
          }
          return ing;
        });
      };

      const newIngredients = processIngredients(meal.ingredients);
      const newScaled = processIngredients(meal.scaledIngredients);

      if (updated) {
        return updateDoc(doc(db, "plannedMeals", mealDoc.id), {
          ingredients: newIngredients || null,
          scaledIngredients: newScaled || null
        });
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);

    const checkedPromises = checkedPlannedKeys.map(key => deleteDoc(doc(db, "shoppingChecked", key)));
    await Promise.all(checkedPromises);
  }

  await Promise.all(manualPromises);
}

export async function getInboxMeals(householdId: string): Promise<Suggestion[]> {
  const suggestionsRef = collection(db, 'suggestions');
  const q = query(suggestionsRef, where('householdId', '==', householdId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Suggestion));
}

export async function addSuggestion(text: string, userId: string, userName: string, householdId: string, forDate?: string): Promise<void> {
  const suggestionsRef = collection(db, 'suggestions');
  const data: Omit<Suggestion, 'id'> = {
    text,
    votes: 1,
    votedBy: [userId],
    status: 'pending',
    suggestedBy: {
      id: userId,
      name: userName
    },
    householdId: householdId,
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

export async function addPlannedSuggestionMeal(text: string, date: string, householdId: string, userId?: string, userName?: string): Promise<void> {
  const plannerRef = collection(db, 'plannedMeals');
  await addDoc(plannerRef, {
    date,
    mealId: 'suggestion-placeholder',
    mealName: text,
    imageUrl: null,
    plannedServings: 4,
    isShopped: false,
    isCooked: false,
    ingredients: [],
    notes: 'Planlagt fra forslag',
    plannedBy: userId ? { id: userId, name: userName || 'Bruker' } : undefined,
    householdId: householdId,
    createdAt: new Date().toISOString()
  });
}

export async function rejectSuggestion(suggestionId: string): Promise<void> {
  const suggestionRef = doc(db, 'suggestions', suggestionId);
  await deleteDoc(suggestionRef);
}
