"use client"
import { useState } from "react";


import Link from "next/link";
import Image from "next/image";
import { FiXCircle, FiMenu } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

import { Roboto } from "next/font/google";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});


export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const { isAuthenticated } = useAuth();

    return (
        <nav className="relative top-0 left-0 w-full bg-darkgrey shadow-md z-50 text-white after:absolute after:left-0 after:bottom-0 after:w-full after:h-3 after:bg-gradient-to-r after:from-myorange after:to-deepred">
            <div className=" mx-auto flex items-center justify-between p-3">

                {/* Mobile Menu Button */}
                <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden order-1">
                    {menuOpen ? <FiXCircle color="white" size={28} /> : <FiMenu color="white" size={28} />}
                </button>
                
                {/* Pantry Pal Logo */} 
                <Link href="/" className="order-2 md:order-1">
                    <p className={roboto.className + "p-0 text-[2rem] font-bold"}>
                        PantryPal
                    </p>
                </Link> 

                {/* Desktop Navigation */}
                <ul className="hidden md:flex space-x-10 gap-10 text-lightgrey text-lg order-2">
                    <li><Link href="/recipeSearch" className="hover:text-myblue">Recipes</Link></li>
                    <li><Link href="/updatePantry" className="hover:text-myblue">Pantry</Link></li>
                    <li><Link href="/ingredientCompatibility" className="hover:text-myblue">Ingredient Compatibility Check</Link></li>
                </ul>

                {/* User Avatar + Menu Button */}
                <div className="flex items-center space-x-4 order-3">
                    {/* User Avatar */}
                    { isAuthenticated ? (
                        <Link href="/account">
                            <Image 
                            src="/tempAvatar.png"
                            alt="User Avatar"
                            width={30}
                            height={30}
                            className="rounded-full cursor-pointer border-2 border-gray-300 hover:border-blue-500"
                            />
                        </Link> 
                        ) : (
                            <Link href="/login">
                                <Image 
                                src="/tempAvatar.png"
                                alt="User Avatar"
                                width={30}
                                height={30}
                                className="rounded-full cursor-pointer border-2 border-gray-300 hover:border-blue-500"
                                />
                        </Link> 
                        )
                    }
 
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{opacity: 0, height: 0}}
                        animate={{opacity: menuOpen ? 1 : 0, height: menuOpen ? "auto": 0}}
                        exit={{opacity: 1, height: 0}}
                        transition={{duration: 0.3, ease: "easeInOut"}}
                        className={`top-16 left-0 w-full bg-darkgrey text-center px-4 md:hidden overflow-hidden
                            ${menuOpen ? "block" : "hidden"}`}
                    >
                        <ul className="md:hidden bg-darkgrey border-t p-4 space-y-2 text-lg text-white">
                            <li><Link className="hover:text-myblue" href="/recipeSearch" onClick={() => setMenuOpen(false)}>Recipes</Link></li>
                            <li><Link className="hover:text-myblue" href="/updatePantry" onClick={() => setMenuOpen(false)}>Pantry</Link></li>
                            <li><Link className="hover:text-myblue" href="/ingredientCompatibility" onClick={() => setMenuOpen(false)}>Ingredient Compatibility Check</Link></li>
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>


        </nav>
    );
}