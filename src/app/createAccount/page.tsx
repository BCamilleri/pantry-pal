"use client"

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
 
export default function CreateAccountPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const res = await fetch("http://localhost:8000/users/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(formData),
            });
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.detail || "Failed to create account.");
            }
            alert ("Account Created");
            router.push("/login"); // nav to login
        } catch (err: any) {
            setError(err.message || "Unexpected error occured");
        }
    };

    return (
        <div className="text-black flex items-center mt-10 justify-center px-4">
        <form className="w-full max-w-md bg-white rounded-xl shadow-md shadow-darkgrey p-6 sm:p-10 md:p-12" onSubmit={handleSubmit}>
          <div className="">
            {/* Username */}
            <div className="mb-4">
              <label>Username</label>
              <input 
                className="mt-1 w-full bg-lightgrey rounded-md shadow shadow-black px-3 py-2"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email */}
            <div className="mb-4">
              <label>Email</label>
              <input 
                className="mt-1 w-full bg-lightgrey rounded-md shadow shadow-black px-3 py-2"
                type="email"
                name="email"
            
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
  
            {/* Password */}
            <div className="mb-6">
              <label>Password</label>
              <input 
                className="mt-1 w-full bg-lightgrey rounded-md shadow shadow-black px-3 py-2"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
  
            {/* Submit */}
            <div className="mb-4">
              <button className="w-full px-6 py-3 text-white font-semibold rounded-lg bg-gradient-to-r from-myorange to-deepred shadow-md transition-colors" type="submit">Create Account</button>
            </div>
  
            {/* Already have an account? */}
            <div className="text-sm text-center justify-between">
              <Link href="/login" className="text-myblue hover:underline cursor-pointer">Already have an account?</Link>
            </div>
  
            {/* Error */}
            {error && (
              <div className="mt-4 text-red-600 text-sm text-center">
                <p>{error}</p>
              </div>
            )}
          </div>
        </form>
      </div>
    )
}