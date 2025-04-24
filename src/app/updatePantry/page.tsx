"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiSearch, FiX } from "react-icons/fi";
import { usePantryService } from "@/services/pantryService";
import { useAuth } from "@/context/AuthContext";

interface PantryItem {
    pantry_id: number;
    ingredient_id: number;
    name: string;
}

interface Ingredient {
    id: number;
    name: string;
}

export default function UpdatePantryPage() {

    const { isAuthenticated, userId } = useAuth();
    const { getPantryItems, addPantryItem, searchIngredients, removePantryItem } = usePantryService();


    const [pantry, setPantry] = useState<PantryItem[]>([]);
    const [newIngredient, setNewIngredient] = useState("");
    const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // load pantry items when userId changes
    useEffect(() => {
        if (isAuthenticated && userId) {
            loadPantryItems();
        }
    }, [isAuthenticated, userId]);

    const loadPantryItems = async () => {
        try {
            const items = await getPantryItems(userId!);
            setPantry(items);
        } catch (error) {
            console.error("Error loading pantry:", error);
            setError("Failed to load pantry items");
        }
    };

    const handleSearch = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            setIsSearching(true);
            const results = await searchIngredients(query);
            setSearchResults(results);
        } catch (error) {
            console.error("Error searching ingredients:", error);
            setError("Failed to search ingredients");
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddIngredient = async (ingredientId: number, ingredientName: string) => {
        if (!userId) return;

        try {
            // optimstic update
            const temporaryId = Date.now(); // temp id for optimistic update
            setPantry(prev => [
                ...prev,
                {
                    pantry_id: temporaryId,
                    ingredient_id: ingredientId,
                    name: ingredientName
                }
            ]);

            setNewIngredient("");
            setSearchResults([]);

            // actual api call
            await addPantryItem(userId, ingredientId);

            // refresh from server to get real pantry_id
            await loadPantryItems();
        } catch (error) {
            console.error("Error adding ingredients:", error);
            setError("Failed to add ingredient");
            // revert optimistic update
            setPantry(prev => prev.filter(item => item.ingredient_id !== ingredientId));
        }
    };

    const handleRemoveIngredient = async (pantryId: number) => {
        if (!userId) return;

        try {
            // optimistic update
            setPantry(prev => prev.filter(item => item.pantry_id !== pantryId));

            await removePantryItem(pantryId);

            // confirm
            await loadPantryItems();
        } catch (error) {
            console.error("Error removing ingredient", error);
            setError("Failed to remove ingredient");
            // revert
            loadPantryItems();
        }
    };

    return (
        <div className="p-6 text-black">
            <div className="flex flex-col gap-6">
                {/* Add Ingredient Box */}
                <div className="flex-1 border-3 border-black border-[3px] p-6 rounded-lg bg-white relative">
                    <h2 className="text-xl font-semibold mb-4">Add Ingredient</h2>
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                className="w-full pl-10 p-2 border border-gray-300 rounded-lg"
                                placeholder="Search ingredients..."
                                value={newIngredient}
                                onChange={(e) => {
                                    setNewIngredient(e.target.value);
                                    handleSearch(e.target.value);
                                }}
                            />
                            <FiSearch className="absolute left-3 top-3 text-darkgrey" />
                        </div>
                    </div>

                    {/* Dropdown box */}
                    {newIngredient && searchIngredients.length > 0 && (
                        <div className="mt-2 border border-gray-200 rounded-lg shadow-lg bg-white max-h-60 overflow-y-auto">
                            {searchResults.map((item) => (
                                <div 
                                  key={item.id} 
                                  className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                                  onClick={() => handleAddIngredient(item.id, item.name)}
                                >
                                    <span>{item.name}</span>
                                    <FiPlus className="text-gray-500" />
                                </div>
                            ))}
                        </div>
                    )}

                    {isSearching && (
                        <div className="mt-2 p-3 text-center text-gray-500">
                            Searching...
                        </div>
                    )}
                </div>

                {/* Pantry Box */}
                <div className="flex-1 border-3 border-black p-6 border-[3px] rounded-lg bg-white">
                    <h2 className="text-xl font-semibold mb-4">Your Pantry</h2>
                    <div className="border-l-black border-l-[2px] pl-3">
                        {pantry.length === 0 ? (
                            <p className="text-gray-500">Your pantry is empty. Please add ingredients.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {pantry.map((item) => (
                                        <div
                                          key={item.pantry_id}
                                          className="px-4 py-2 rounded-full border border-gray-300 flex items-center gap-2"
                                        >
                                            {item.name}
                                            <button
                                              onClick={() => handleRemoveIngredient(item.pantry_id)}
                                              className="text-gray-500 hover:text-red-500 hover:transition-colors hover:scale-125 transition-scale hover:transition ease-in-out"
                                            >
                                                <FiX />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
  }