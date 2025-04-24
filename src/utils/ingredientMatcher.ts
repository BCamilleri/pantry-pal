// words that make partial matches incompatible
// i.e. cream -> double cream OK
//      beef --> beef stock NOT OK
const INCOMPATIBLE_MODIFIERS = [
    // forms
    'stock', 'powder', 'extract', 'jus', 'juice',
    'oil', 'sauce', 'broth', 'concentracte', 'essence',
    'granules', 'ground', 'minced', 'paste', 'syrup',

    // variants
    'canned', 'jarred', 'dried', 'pickled', 'cured', 'smoked',
    'candied',

    // parts
    'seed', 'root', 'leaf', 

    // chemical
    'starch', 'flour',

    // other
    'cream of', 'substitute', 'artificial'
]

export function isCompatibleIngredientMatch(recipeIng: string, pantryIng: string): boolean {
    const normalisedRecipeIng = recipeIng.trim().toLowerCase();
    const normalisedPantryIng = pantryIng.trim().toLowerCase();

    // exact always counts
    if (normalisedPantryIng === normalisedRecipeIng) return true;

    // special cases
    if (pantryIng === 'cream' && recipeIng === 'coconut cream' || pantryIng === 'coconut cream' && recipeIng === 'cream') {
        return false;
    }
    if (pantryIng === 'cheese' && !['cream cheese', 'cheese sauce'].includes(recipeIng)) {
        return true;
    }

    // partial matches:
    // 1. substring
    // 2. min length 
    // 3. not followed by incompatible modifiers
    return normalisedRecipeIng.includes(normalisedPantryIng) && 
    normalisedPantryIng.length > 3 && 
    !INCOMPATIBLE_MODIFIERS.some(modifier => 
        normalisedRecipeIng.indexOf(normalisedPantryIng) < normalisedRecipeIng.indexOf(modifier)
    );
}

export function getIngredientMatchType(recipeIng: string, pantryIng: string): 'exact' | 'partial' | 'none' {
    if (recipeIng.trim().toLowerCase() === pantryIng.trim().toLowerCase()) {
        return 'exact';
    }
    if (isCompatibleIngredientMatch(recipeIng, pantryIng)) {
        return 'partial';
    }
    return 'none';
}