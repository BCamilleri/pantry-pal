"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui"
import Link from 'next/link'
import { useParams, useRouter } from "next/navigation"

const MEALDB_URL = "https://www.themealdb.com/api/json/v1/1";

interface RecipeDetails {
    idMeal: string;
    strMeal: string;
    strMealThumb: string;
    strInstructions: string;
    strYoutube?: string;
    [key: string]: string | null | undefined;
}

export default function RecipePage() {
    const [recipe, setRecipe] = useState<RecipeDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const params = useParams();
    const router = useRouter();

    useEffect(() => {
        const fetchRecipe = async () => {
            try {
                setLoading(true);
                const response = await fetch(
                    `${MEALDB_URL}/lookup.php?i=${params.id}`
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch recipe");
                }

                const data = await response.json();
                if (data.meals && data.meals.length > 0) {
                    setRecipe(data.meals[0]);
                } else {
                    setError("Recipe not found");
                }
            } catch (error) {
                setError("Failed to load recipe");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecipe();
    }, [params.id]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen">{error}</div>;
    }

    if (!recipe) {
        return <div className="flex justify-center items-center h-screen">No recipe data</div>;
    }   

    // extract ingredients and measures
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = recipe[`strIngredient${i}`];
        const measure = recipe[`strMeasure${i}`];
        if (ingredient && ingredient.trim() !== '') {
            ingredients.push({ ingredient, measure });
        }
    }

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

                <div className="p-6">
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
                </div>
            </div>
        </div>
    );

}