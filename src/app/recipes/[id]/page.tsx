"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui"
import Link from 'next/link'
import { useParams, useRouter } from "next/navigation"
import { useAuth } from '@/context/AuthContext'
import { usePantryService } from "@/services/pantryService"

const MEALDB_URL = "https://www.themealdb.com/api/json/v2/" + process.env.NEXT_PUBLIC_MEAL_DB_API_KEY;

interface RecipeDetails {
    idMeal: string;
    strMeal: string;
    strMealThumb: string;
    strInstructions: string;
    strYoutube?: string;
    [key: string]: string | null | undefined;
}

interface IngredientItem {
    ingredient: string;
    measure: string;
    inPantry: boolean;
}

export default function RecipePage() {
    const { isAuthenticated, userId } = useAuth();
    const pantryService = usePantryService();

    const [recipe, setRecipe] = useState<RecipeDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
    const [pantryItems, setPantryItems] = useState<string[]>([]);
    const [showShoppingList, setShowShoppingList] = useState(false);
    const params = useParams();
    const router = useRouter();

    // fetch recipe data + pantry items
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log("Fetching recipe for ID:", params.id);
    
                // fetch recipe
                const recipeResponse = await fetch(`${MEALDB_URL}/lookup.php?i=${params.id}`);
                if (!recipeResponse.ok) throw new Error("Failed to fetch recipe");
                const recipeData = await recipeResponse.json();
    
                if (!recipeData.meals?.[0]) {
                    setError("Recipe not found");
                    return;
                }
    
                setRecipe(recipeData.meals[0]);

                console.log(recipe)
    
                // fetch pantry if authenticated
                if (isAuthenticated && userId) {
                    const pantryResponse = await pantryService.getPantryItems(userId);
                    const pantryIngredientNames = pantryResponse.map((item: any) => item.name.toLowerCase().trim());
                    setPantryItems(pantryIngredientNames);
                }
            } catch (error) {
                setError("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.id, isAuthenticated, userId]);

    // process ingredients
    useEffect(() => {
        if (!recipe) return;

        const extractedIngredients: IngredientItem[] = [];
        for (let i = 1; i <= 20; i++) {
            const ingredient = recipe[`strIngredient${i}`];
            const measure = recipe[`strMeasure${i}`];
            if (ingredient && ingredient.trim() !== '') {
                const normalisedIngredient = ingredient.toLowerCase().trim();
                extractedIngredients.push({
                    ingredient,
                    measure: measure || '',
                    inPantry: pantryItems.includes(normalisedIngredient)
                });
            }
        }
        setIngredients(extractedIngredients);
    }, [recipe, pantryItems]);

    if (loading) {
        return (
            <div className='flex justify-center items-center h-screen'>
                <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-myblue'></div>
            </div>
        )
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen">{error}</div>;
    }

    if (!recipe) {
        return <div className="flex justify-center items-center h-screen">No recipe data</div>;
    }   

    const shoppingListItems = ingredients.filter(item => !item.inPantry);

    return (
        <div className="max-w-4xl mx-auto p-6 pt-2">
            <button onClick={() => router.push('/recipeSearch')} className="inline-flex items-center justify-center px-4 py-0.5 border rounded-md mb-2 bg-darkgrey text-white hover:bg-gradient-to-r hover:from-myorange hover:to-deepred">
                Back
            </button>

            <div className="bg-lightgrey rounded-lg shadow-md overflow-hidden border-black border-[1px]">
                <img 
                  src={recipe.strMealThumb}
                  alt={recipe.strMeal}
                  className="w-full h-64 object-cover border-b-black border-b-[2px] shadow-sm shadow-lightgrey"
                />

                <div className="p-6 pb-0">
                    <h1 className="shadow-sm shadow-darkgrey text-center text-3xl font-bold mb-4 border-black border-[1px] rounded-full p-2 bg-white">{recipe.strMeal}</h1>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="border border-black p-3 rounded-2xl bg-white shadow-sm shadow-darkgrey">
                            <h2 className="text-xl font-semibold mb-3">Ingredients</h2>
                            <ul className="space-y-2">
                                {ingredients.map((item, index) => (
                                    <li key={index} className="flex items-start">
                                        <span className="inline-block w-6">•</span>
                                        <span>
                                            {item.measure && 
                                            <span className="font-medium">
                                                {item.measure}{"\t"}
                                            </span>}
                                            {item.ingredient}
                                            {item.inPantry && (
                                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                    In Pantry
                                                </span>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-white border border-black rounded-2xl p-3 shadow-sm shadow-darkgrey">
                            <h2 className="text-xl font-semibold mb-3">Instructions</h2>
                            <div className="whitespace-pre-line">
                                {recipe.strInstructions}
                            </div>

                            {recipe.strYoutube && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold mb-2">Video Tutorial</h3>
                                    <a 
                                      href={recipe.strYoutube}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                    >
                                        Watch on Youtube
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Shopping List Toggle */}
                    {isAuthenticated && (
                        <div className="flex justify-center mt-3">
                            <Button
                              onClick={() => setShowShoppingList(!showShoppingList)}
                              className="mb-3"
                            >
                                {showShoppingList ? 'Hide Shopping List' : 'Show Shopping List'}
                            </Button>
                        </div>
                    )}

                    {/* Shopping List */}
                    {showShoppingList && (
                        <div className="mb-6 p-4 bg-white border border-black rounded-lg shadow-md">
                            <div className="flex justify-between items center mb-4">
                                <h2 className="text-2xl font-bold">Shopping List</h2>
                                <Button
                                  onClick={() => window.print()}
                                  className="bg-green-600 text-white hover:bg-green-700"
                                >
                                    Print List
                                </Button>
                            </div>
                            <ul className="space-y-2">
                                {shoppingListItems.length > 0 ? (
                                    shoppingListItems.map((item, index) => (
                                        <li key={index} className="flex items-start">
                                            <span className="inline-block w-6">.</span>
                                            <span>
                                                {item.measure && 
                                                    <span className="font-medium">
                                                        {item.measure}{"\t"}
                                                    </span>
                                                }
                                                {item.ingredient}
                                            </span>
                                        </li>
                                    ))
                                ) : (
                                    <p className="text-gray-500">You already have all the ingredients :)</p>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

}