"use client"

import Link from "next/link";
import Image from "next/image"
import { FiSearch, FiPlus, FiStar } from "react-icons/fi"
import { useEffect, useState } from "react";

interface Meal {
    idMeal: string;
    strMeal: string;
    strMealThumb: string;
    strInstructions?: string;
    [key: string]: any;
}

const FALLBACK_RECIPE: Meal = {
    idMeal: "1",
    strMeal: "Rigatoni with Sausage Ragu",
    strMealThumb: "/tempHighlightedRecipeImage.jpg"
};

export default function HomePage() {

    const [randomRecipe, setRandomRecipe] = useState<Meal | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRandomRecipe = async () => {
            try {
                setLoading(true);
                const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/recipes/random`;
                console.log(url);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error("Failed to fetch random recipe");
                }
                const data = await response.json();
                console.log(data);
                setRandomRecipe(data.meal);
            } catch (error) {
                console.error(error)
                setRandomRecipe(FALLBACK_RECIPE);
            } finally {
                setLoading(false);
            }
        }

        fetchRandomRecipe();
    }, []);

    const displayRecipe = randomRecipe || FALLBACK_RECIPE;
 
    return (
        <div className="p-6">
            {/* Use flex instead of forcing grid columns at md */}
            <div className="flex flex-col md:flex-row gap-6">
                {/* Navigation Panel */}
                <div className="flex-1 grid grid-cols-1 gap-4 border-[3px] border-black p-3 rounded-lg bg-white">
                    <Link href="/recipeSearch" className="p-6 bg-deepred text-white rounded-xl flex justify-between items-center hover:bg-gray-700 transition">
                        <div>
                            <h2 className="text-xl font-semibold">Recipe Search</h2>
                            <p className="text-sm mt-1">Search for recipes featuring your pantry ingredients</p>
                        </div>
                        <FiSearch className="w-20 h-20 text-white" />            
                    </Link>
                    
                    <Link href="/updatePantry" className="p-6 bg-myorange text-white rounded-xl flex justify-between items-center hover:bg-gray-700 transition">
                        <div>
                            <h2 className="text-xl font-semibold">Update Pantry</h2>
                            <p className="text-sm mt-1">Add Ingredients to your pantry</p>
                        </div>
                        <FiPlus className="w-20 h-20 text-white" />            
                    </Link>
    
                    <Link href="/ingredientCompatibility" className="p-6 bg-myblue text-white rounded-xl flex justify-between items-center hover:bg-gray-700 transition">
                        <div>
                            <h2 className="text-xl font-semibold">Ingredient Compatibility</h2>
                            <p className="text-sm mt-1">Check which ingredients you can pair for a custom meal</p>
                        </div>
                        <FiStar className="w-20 h-20 text-white" />            
                    </Link>
                </div>
    
                {/* Highlighted Recipe Panel */}
                <div className="w-full flex-1 border-black border-[3px] p-6 rounded-lg text-center mx-auto bg-white">
                    <h2 className="m-2 font-bold text-black text-4xl">Highlighted Recipe</h2>
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-myblue"></div>
                        </div>
                    ) : (
                        <>
                            <img
                              className="mx-auto shadow shadow-gray-800"
                              src={displayRecipe.strMealThumb}
                              alt={displayRecipe.strMeal}
                              width={400}
                            />
                            <p className="text-2xl p-5 m-5 font-bold bg-darkgrey rounded-lg text-white shadow shadow-gray-800 shadow-sm">
                                {displayRecipe.strMeal}
                            </p>
                            {displayRecipe.idMeal !== FALLBACK_RECIPE.idMeal && (
                                <Link
                                href={`/recipes/${displayRecipe.idMeal}`} key={displayRecipe.idMeal}
                                >View Recipe Details</Link>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}