"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePantryService } from '@/services/pantryService';
import { useCompatibilityService } from '@/services/compatibilityService';
import { Button } from '@/components/ui';
import Link from 'next/link';

interface PantryItem {
    pantry_id: number;
    ingredient_id: number;
    name: string;
}

interface IngredientGroup {
    ingredients: string[];
    score: number;
}

export default function IngredientCompatibilityPage() {

    const { isAuthenticated, userId } = useAuth();
    const { getPantryItems } = usePantryService();
    const { getCompatibleGroups } = useCompatibilityService();

    const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
    const [compatibleGroups, setCompatibleGroups] = useState<IngredientGroup[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const typeColours: Record<string, string> = {
        "meat": "border-deepred",
        "veg": "border-green-500",
        "dairy": "border-yellow-400",
        "grain": "border-yellow-700",
        "fish": "border-blue-700",
        "other": "border-black"
    };

    // crude method of adding some colour
    // i know it's not ideal but this is hardly the most important part
    // of this project...
    const getIngredientType = (name: string): 'veg' | 'grain' | 'dairy' | 'fish' | 'meat' | 'other' => {
        const normalisedName = name.toLowerCase().trim();
        const meatTypes = ['chicken', 'beef', 'pork', 'lamb', 'steak'];
        const dairyTypes = ['milk', 'cream', 'cheese', 'butter', 'yogurt', 'yoghurt', 'egg', 'cheddar', 'mozzarella', 'feta'];
        const fishTypes = ['fish', 'salmon', 'cod', 'tuna', 'sea bass', 'trout', 'halibut', 'skipper', 'swordfish', 'anchovy'];
        const grainTypes = ['flour', 'bread', 'rice', 'pasta', 'wheat', 'wholewheat', 'chickpeas'];
        const vegTypes = ['tomato', 'onion', 'vegan', 'corn', 'sweetcorn', 'vegetable', 'pepper', 'celery', 'carrot',
            'apple', 'banana', 'grape', 'orange', 'fruit', 'strawberry', 'raspberry', 'potato', 'potatoes',
            'rhubarb', 'lettuce', 'cabbage', 'leaf', 'salad', 'rocket', 'arugula', 'pineapple', 'lemon', 'lime',
            'basil', 'oregano', 'cucumber', 'parsley', 'mint', 'garlic', 'capers'
        ];
        for (let type of vegTypes) {
            if (normalisedName.includes(type)) {
                return 'veg';
            }
        }
        for (let type of grainTypes) {
            if (normalisedName.includes(type)) return 'grain';
        }
        for (let type of dairyTypes) {
            if (normalisedName.includes(type)) return 'dairy';
        }
        for (let type of fishTypes) {
            if (normalisedName.includes(type)) return 'fish';
        }
        for (let type of meatTypes) {
            if (normalisedName.includes(type)) return 'meat';
        }
        return 'other';
    };

    useEffect(() => {
        if (isAuthenticated && userId) {
            loadPantry();
        }
    }, [isAuthenticated, userId]);

    const loadPantry = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const items: PantryItem[] = await getPantryItems(userId!);
            setPantryItems(items);
            const names = items.map(item => item.name);
            await findCompatibleGroups(items.map(item => item.name));
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to load pantry");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const findCompatibleGroups = async (ingredients: string[]) => {
        if (ingredients.length < 2) {
            setCompatibleGroups([]);
            return;
        }
        try {
            setIsLoading(true);
            const groups = await getCompatibleGroups(ingredients);
            setCompatibleGroups(groups);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to find compatible groups.")
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshCompatibility = () => {
        const names = pantryItems.map(item => item.name);
        findCompatibleGroups(pantryItems.map(item => item.name).filter(name => name && name.length > 1));
    };

    if (isLoading) {
        return (
            <div className='flex justify-center items-center h-screen'>
                <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-myblue'></div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <div className='mt-5 flex flex-col items-center justify-center'>
                <h2 className='text-xl font-semibold mb-4'>Please log in to view your pantry compatibility</h2>
                <Link href="/login">
                    <Button onClick={() => null}>Log in</Button>
                </Link>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-3 px-10 py-5">
            <h1 className='text-3xl font-bold text-darkgrey text-center mb-2'>Ingredient Compatibility</h1>
                <div className="flex-1 border-3 border-black p-6 border-[2px] rounded-lg bg-white">
                        <div className='flex justify-between mb-5'>
                            <h2 className="text-xl font-semibold">Your Pantry</h2>
                            <Button onClick={refreshCompatibility} className='px-4 py-2'>Refresh Compatibility</Button>
                        </div>
                        <div className="border-l-black border-l-[2px] pl-3">
                            <div className="flex flex-wrap gap-2">
                                {pantryItems.map((item) => (
                                    <span
                                        key={item.pantry_id}
                                        className={`mt-2 px-4 py-2 rounded-full border border-[2px] ${typeColours[getIngredientType(item.name)]}`}
                                    >
                                        {item.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
            <div className="flex-col text-black p-4 border-[2px] border-black rounded-xl bg-white">
                <h2 className="text-xl font-semibold mb-4">Your Personalised Ingredient Match-ups</h2>
                    {error && (
                        <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded'>
                        {error}
                        </div>
                    )}
                    {compatibleGroups.length === 0 ? (
                        <p className='text-darkgrey'>No custom matchups found for your ingredients. Try adding more ingredients to your pantry.</p>
                    ) : (
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                            {compatibleGroups.map((group, index) => (
                                <div key={index} className="m-2 p-4 border border-black border-[1px] rounded-xl">
                                    <h3 className='font-medium mb-2'>Group {index + 1}</h3>
                                    <ul className='list-disc pl-5'>
                                        {group.ingredients.map((ingredient, idx) => (
                                            <li key={idx}>{ingredient}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
            </div>
        </div>
    )
}