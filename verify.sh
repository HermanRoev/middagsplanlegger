#!/bin/bash

# Function to check for object-cover in a file
check_object_cover() {
  if grep -r "object-cover" $1; then
    echo "Error: 'object-cover' found in $1"
    exit 1
  fi
}

# Check specific files
check_object_cover "src/components/CalendarView.tsx"
check_object_cover "src/components/MealCard.tsx"
check_object_cover "src/components/MealForm.tsx"
check_object_cover "src/components/AddMealToPlanView.tsx"

# Run prettier
npx prettier --write .

echo "Verification successful!"
