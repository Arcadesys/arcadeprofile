// mealplan.js

// Prompt template with placeholders
const promptTemplate = `
You are a meal planning assistant. Based on the following user input, generate a meal plan, recipe list, and grocery list (sorted by department and appropriately portioned for the number of diners) for the week:

User Input:
Number of People: {{numberOfPeople}}

Meal Details:
Breakfast - Meals to Cook: {{breakfastCook}}, Meals to Eat: {{breakfastEat}}
Lunch - Meals to Cook: {{lunchCook}}, Meals to Eat: {{lunchEat}}
Dinner - Meals to Cook: {{dinnerCook}}, Meals to Eat: {{dinnerEat}}

Dietary Restrictions: {{dietaryRestrictions}}
Meal Preferences: {{preferences}}
Ingredients to Use: {{ingredients}}
Specific Recipes or Dishes: {{recipes}}
User's Feelings about Cooking this Week: {{cookingFeel}}

Please provide a detailed meal plan that takes into account the number of people, meals to cook and eat, dietary restrictions, preferences, and the user's feelings about cooking. Your response should be in the following format:
##
# Grocery list
## Produce
(list of all produce required for the week, scaled to the number of people cooking for)
## Protein
(List all protein required for the week)
{Continue this process for all typical grocery departments, in the most common order they might appear to someone who is shopping there)}

# Recipes
{give step-by-step recipes for each meal of each day of the week, following the markdown format already established above.}

# Tips to Save time
{List any opportunities to save prep time in a bulleted list.}
`;

// Function to replace placeholders with actual data
function constructPrompt(template, data) {
  let prompt = template;

  // Replace placeholders with data
  prompt = prompt.replace('{{numberOfPeople}}', data.numberOfPeople || 'None');

  prompt = prompt.replace('{{breakfastCook}}', data.mealDetails.Breakfast.cook || '0');
  prompt = prompt.replace('{{breakfastEat}}', data.mealDetails.Breakfast.eat || '0');
  prompt = prompt.replace('{{lunchCook}}', data.mealDetails.Lunch.cook || '0');
  prompt = prompt.replace('{{lunchEat}}', data.mealDetails.Lunch.eat || '0');
  prompt = prompt.replace('{{dinnerCook}}', data.mealDetails.Dinner.cook || '0');
  prompt = prompt.replace('{{dinnerEat}}', data.mealDetails.Dinner.eat || '0');

  prompt = prompt.replace('{{dietaryRestrictions}}', data.dietaryRestrictions.join(', ') || 'None');
  prompt = prompt.replace('{{preferences}}', data.preferences.join(', ') || 'None');
  prompt = prompt.replace('{{ingredients}}', data.ingredients || 'None');
  prompt = prompt.replace('{{recipes}}', data.recipes || 'None');
  prompt = prompt.replace('{{cookingFeel}}', data.cookingFeel || 'None');

  return prompt;
}

module.exports = {
  constructPrompt,
  promptTemplate,
};
