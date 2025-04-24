"use client"

import { useState, useEffect } from 'react';
import { Input, Button, Card, CardContent } from "@/components/ui";
import { useAuth } from '@/context/AuthContext';
import { usePantryService } from '@/services/pantryService';
import { isCompatibleIngredientMatch, getIngredientMatchType } from '@/utils/ingredientMatcher';
import { isUint16Array } from 'util/types';
import { inflate } from 'zlib';
import Link from "next/link";
import { match } from 'assert';
import { ApiError } from 'next/dist/server/api-utils';

const MEALDB_URL = "https://www.themealdb.com/api/json/v2/" + process.env.NEXT_PUBLIC_MEAL_DB_API_KEY;
const BACKEND_API = "http://localhost:8000"


type Meal = {
    idMeal: string;
    strMeal: string;
    strMealThumb: string;
    [key: string]: string | null;
};

type ScoredMeal = Meal & {
    score: number;
    matchedIngredients: string[];
}

type BackendRecipe = {
    idMeal: string;
    strMeal: string;
    strMealThumb: string;
    matched_ingredients: number;
    total_ingredients: number;
    [key: string]: any;
}

export default function RecipeSearchPage() {

    const [ingredientInput, setIngredientInput] = useState<string>("");
    const [recipes, setRecipes] = useState<ScoredMeal[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pantryIngredients, setPantryIngredients] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const { isAuthenticated, userId } = useAuth();
    const pantryService = usePantryService();

    const recipeCache = new Map<string, Meal>();
    const recipesPerPage = 6;

    // load pantry ingredients when component mounts
    useEffect(() => {
        if (isAuthenticated && userId) {
            loadPantryIngredients();
        }
    }, [isAuthenticated, userId]);

    const loadPantryIngredients = async () => {
        try {
            const items = await pantryService.getPantryItems(userId!);
            const ingredientNames = items.map((item: any) => item.name.toLowerCase());
            setPantryIngredients(ingredientNames);
        } catch (error) {
            console.error("Error loading pantry:", error);
        }
    };

    const handleIngredientChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIngredientInput(event.target.value);
        setError(null);
    };

    // fetch recipes from TheMealDBAPI
    const fetchRecipesByIngredient = async (ingredient: string) => {
        try {
            const response = await fetch(
                `${MEALDB_URL}/filter.php?i=${encodeURIComponent(ingredient)}`
            );

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            return data.meals || [];
        } catch (error) {
            console.error(`Error fetching recipes for ${ingredient}:`, error)
            return []; // ret empty array if ingredient not found
        };
    };    

    // updated fetch recipes func, now supports pagination and uses backend
    const fetchRecipesByIngredientNew = async (ingredient: string, page: number = 1) => {
        try {
            const response = await fetch(
                `${BACKEND_API}/api/recipes?ingredient=${encodeURIComponent(ingredient)}&page=${page}&per_page=${recipesPerPage}`, {
                    headers: {
                        "Content-Type": 'application/json',
                    }
                }
            );
            if (response.status === 429) {
                throw new Error("Too many requests - please try again later")
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.detail || 
                    `API request failed with status ${response.status}`
                );
            }
            const data = await response.json();
            setTotalPages(Math.ceil(data.total / recipesPerPage));
            return data.meals || [];
        } catch (error) {
            console.error(`Error fetching recipes for ${ingredient}:`, error);
            setError(error instanceof Error ? error.message : "Failed to fetch recipes");
            return [];
        }
    };

    // get recipe information
    const fetchRecipeDetails = async (mealId: string): Promise<Meal | null> => {
        try {

            if (recipeCache.has(mealId)) {
                console.log("RETURNING CACHED RECIPE")
                return recipeCache.get(mealId) || null;
            }

            const response = await fetch(
                `${MEALDB_URL}/lookup.php?i=${mealId}`
            );

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
             const data = await response.json();
             if (data) {
                recipeCache.set(mealId, data.meals?.[0])
             }
             return data.meals?.[0] || null;
        } catch (error) {
            console.error(`Error fetching details for meal ${mealId}:`, error);
            return null;
        }
    };

    // updated fetch recipe func with pagiation and uses fastAPI endpoint for query
    const fetchRecipeDetailsNew = async (mealId: string): Promise<Meal | null> => {
        try {
            if (recipeCache.has(mealId)) {
                return recipeCache.get(mealId) ||  null;
            }
            const response = await fetch(
                `${BACKEND_API}/api/recipes/details?meal_id=${mealId}`
            );
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            const data = await response.json();
            const meal = data.meal;

            if (meal) {
                recipeCache.set(mealId, meal);
            }

            return meal || null;
        } catch (error) {
            console.error(`Error fetching details for meal ${mealId}:`, error);
            return null;
        }
    };

    // extract ingredients from recipe 
    const extractIngredients = (recipe: Meal) => {
        const ingredients: string[] = [];
        for (let i = 1; i <= 20; i++) {
            const ingredient = recipe[`strIngredient${i}`];
            if (ingredient && ingredient.trim() !== "") {
                ingredients.push(ingredient.toLowerCase());
            }
        }
        return ingredients;
    };

    // highlight ingredients user has in pantry
    const highlightIngredients = (ingredients: string[], pantryIngredients: string[]) => {
        const normalisedPantry = pantryIngredients.map(ing => ing.trim().toLowerCase());
        return ingredients.map((ingredient, index) => {
            const matchType = pantryIngredients.some(pantryIng =>
                getIngredientMatchType(ingredient, pantryIng) !== 'none'
            ) ? 'exact' : pantryIngredients.some(pantryIng =>
                getIngredientMatchType(ingredient, pantryIng) === 'partial'
            ) ? 'partial' : 'none';

            if (matchType === 'exact') {
                return (
                    <span key={index} className='font-bold text-myblue'>
                        {ingredient}
                    </span>
                );
            } else if (matchType === 'partial') {
                return (
                    <span key={index} className='font-bold text-green-600'>
                        {ingredient}
                    </span>
                );
            }
            return <span key={index}>{ingredient}</span>

        });
    };

    const fetchRecipesByMultipleIngredients = async (ingredients: string[], page: number = 1) => {
        try {
            const response = await fetch(
                `${BACKEND_API}/api/recipes/multi-ingredient?ingredients=${encodeURIComponent(ingredients.join(","))}&page=${page}&per_page=${recipesPerPage}`, {
                    headers: {
                        "Content-Type": 'application/json',
                    }
                }
            );
            if (response.status === 429) {
                throw new Error("Too many requests - please try again later")
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.detail || `API request failed with status ${response.status}`
                );
            }
            const data = await response.json();
            setTotalPages(Math.ceil(data.total / recipesPerPage));
            return data.meals || [];
        } catch (error) {
            console.error("Error fetching recipes:", error);
            setError(error instanceof Error ? error.message : "Failed to fetch recipes");
            return [];
        }
    };

    async function handleSearch(page: number = 1) {
        setLoading(true);
        setRecipes([]);
        setError(null);
        setCurrentPage(page);

        try {
            // use input or pantry items if input is empty
            const searchIngredients = ingredientInput 
            ? ingredientInput.split(",").map(i => i.trim().toLowerCase())
            : pantryIngredients;

            if (searchIngredients.length === 0) {
                setLoading(false);
                return;
            }

            // fetch recipes for each ingredient and merge results
            const allRecipes: Meal[] = [];
            const validIngredients: string[] = [];
            for (const ingredient of searchIngredients) {
                const recipes = await fetchRecipesByIngredientNew(ingredient, page);
                if (recipes.length > 0) {
                    validIngredients.push(ingredient);
                    allRecipes.push(...recipes);
                }
            }
            console.log(allRecipes)

            if (validIngredients.length === 0) {
                setError("No recipes found for these ingredients.");
                setLoading(false);
                return;
            }

            // remove duplicates + fetch details
            const uniqueRecipes = Array.from(new Map(allRecipes.map(m => [m.idMeal, m])).values());
            const detailedRecipes = (await Promise.all(
                Array.from(uniqueRecipes).map(recipe => fetchRecipeDetailsNew(recipe.idMeal))
            )).filter(Boolean) as Meal[];

            // score and sort recipes based on ingredient matches 
            const scoredRecipes = detailedRecipes.map(recipe => {
                const recipeIngredients = extractIngredients(recipe);
                const matchedIngredients = validIngredients.filter(searchIng => 
                    recipeIngredients.some(recipeIng => 
                        isCompatibleIngredientMatch(recipeIng, searchIng)
                    )
                );
                return {
                    ...recipe,
                    score: matchedIngredients.length,
                    matchedIngredients
                } as ScoredMeal;
            });

            // filter recipes with no matches and sort by score
            const filteredRecipes = scoredRecipes
            .filter(recipe => recipe.score > 0)
            .sort((a, b) => b.score - a.score);

            if (filteredRecipes.length === 0) {
                setError("No complete recipes found. You may need more ingredients.");
            }
            setRecipes(filteredRecipes);
        } catch (error) {
            console.error("Error fetching recipes", error);
            setError("Failed to search recipes. Please try again later.")
        } finally {
            setLoading(false);
        }
    }

    const handleSearchNew = async (page: number = 1) => {
        setLoading(true);
        setRecipes([]);
        setError(null);
        setCurrentPage(page);

        try {
            const searchIngredients = ingredientInput ? 
            ingredientInput.split(",").map(i => i.trim().toLowerCase()) :
            pantryIngredients;

            if (searchIngredients.length === 0) {
                setLoading(false);
                return;
            }

            const recipes = await fetchRecipesByMultipleIngredients(searchIngredients, page);

            if (recipes.length === 0) {
                setError("No recipes found for these ingredients.")
            } else {
                const scoredRecipes: ScoredMeal[] = recipes.map((recipe: BackendRecipe) => {
                    // extract all string values from recipe
                    const stringValues = Object.values(recipe)
                    .filter((val): val is string => typeof val === 'string')
                    .map(val => val.toLowerCase());

                    // find which search ingredients are in recipe
                    const matchedIngredients = searchIngredients.filter(ing =>
                        stringValues.some(val => val.includes(ing))
                    );

                    return {
                        idMeal: recipe.idMeal,
                        strMeal: recipe.strMeal,
                        strMealThumb: recipe.strMealThumb,
                        score: recipe.matched_ingredients,
                        matchedIngredients, 
                        ...Object.fromEntries(
                            Object.entries(recipe)
                            .filter(([key]) => !['idMeal', 'strMeal', 'strMealThumb', 'matched_ingredients'].includes(key))
                        )
                    } as ScoredMeal;
                });

                setRecipes(scoredRecipes);
            }
        } catch (error) {
            console.error("Error fetching recipes", error);
            setError("Failed to search recipes. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="text-darkgrey max-w-4xl mx-auto p-6 flex flex-col h-screen">
            <div className="flex gap-2 mb-4">
                <Input 
                    type="text"
                    placeholder={
                        pantryIngredients.length > 0
                        ? "Enter ingredients (comma-separated) or leave empty to search your pantry"
                        : "Enter ingredients (comma-separated)"
                    }
                    value={ingredientInput}
                    onChange={handleIngredientChange}
                    className='flex-grow'
                />
                <Button onClick={() => handleSearchNew(1)} disabled={loading} className='font-bold'>
                    {loading ? "Searching..." : "Search"}
                </Button>
            </div>

                    {error && (
                        <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded'>
                        {error}
                        </div>
                    )}

            <div className="flex-grow overflow-y-auto bg-lightgrey p-4 rounded-xl">
                {recipes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {recipes.map((recipe) => {
                            const ingredients = extractIngredients(recipe);
                            return (
                                <Link href={`/recipes/${recipe.idMeal}`} key={recipe.idMeal}>
                                    <Card key={recipe.idMeal} className='hover:bg-gradient-to-b hover:from-white hover:to-lightgrey hover:shadow-lg border-[1px] transition-shadow transition-colors hover:transition-colors cursor-pointer h-full flex flex-col border-black shadow-md bg-white'>
                                        <CardContent className='p-4 flex flex-col flex-grow'>
                                            <div className='flex justify-between items-start mb-2'>
                                                <h2 className='text-lg font-semibold'>{recipe.strMeal}</h2>       
                                                <span className='bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded'>
                                                    {recipe.score}/{ingredients.length} matches   
                                                </span>                                     
                                            </div>

                                            <img 
                                            src={recipe.strMealThumb}
                                            alt={recipe.strMeal}
                                            className='w-full h-32 object-cover mb-2 rounded'
                                            />
                                            <p className='text-sm text-darkgrey'>
                                                <span className='font-medium'>Ingredients: </span>
                                                {highlightIngredients(ingredients, pantryIngredients).reduce(
                                                    (acc, element, index) => acc.length === 0
                                                    ? [element]
                                                    : [...acc, ', ', element],
                                                    [] as React.ReactNode[]
                                                )}
                                            </p>
                                        </CardContent>
                                    </Card>                                    
                                </Link>

                            );
                        })}
                    </div>
                ) : (
                    <p className='text-gray-500 text-center'>
                        {loading ? "Loading recipes..." : "No recipes found. Try different ingredients."}
                    </p>
                )
                }
                {/* Pagination controls */}
                {recipes.length > 0 && (
                    <div className="flex justify-center mt-4 space-x-2">
                        <button
                            onClick={() => handleSearchNew(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`px-4 py-2 rounded ${currentPage === 1 ? 'bg-gray-200 cursor-not-allowed' : 'bg-myblue text-white hover:bg-blue-600'}`}
                        >
                            Previous
                        </button>

                        {Array.from({length: Math.min(5, totalPages) }).map((_, index) => {
                            const pageNum = index + 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => handleSearchNew(pageNum)}
                                    className={`px-4 py-2 rounded ${currentPage === pageNum ? 'bg-myblue text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => handleSearchNew(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`px-4 py-2 rounded ${currentPage === totalPages ? 'bg-gray-200 cursor-not-allowed' : 'bg-myblue text-white hover:bg-blue-600'}`}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
  }