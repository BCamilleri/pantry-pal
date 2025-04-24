import Link from "next/link";
import Image from "next/image"
import { FiSearch, FiPlus, FiStar } from "react-icons/fi"


export default function HomePage() {
 
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
                <div className="flex-1 border-black border-[3px] p-6 rounded-lg text-center mx-auto bg-white">
                    <h2 className="m-2 font-bold text-black text-4xl">Highlighted Recipe</h2>
                    <Image className="mx-auto shadow shadow-gray-800" src="/tempHighlightedRecipeImage.jpg" alt="Highlighted Recipe" width={500} height={500}/>
                    <p className="p-5 m-5 font-bold bg-darkgrey rounded-lg text-lg text-white shadow shadow-gray-800 shadow-sm">Rigatoni with Sausage Ragu</p>
                </div>
            </div>
        </div>
    );
}