"use client";

import { COMMON_INGREDIENTS } from "@/data/ingredients";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function PopulateIngredients() {
    const API_URL = "http://localhost:8000"
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [csvData, setCsvData] = useState<string[]>([]);
    const { isAuthenticated } = useAuth();

    const handlePopulate = async (ingredients: string[]) => {
        if (!isAuthenticated) {
            setResult({error: "Must be logged in"})
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("No token found");

            const response = await fetch(`${API_URL}/ingredients/bulk/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    ingredients
                })
            });
            if (!response.ok) {
                throw new Error(`HTTP error. status: ${response.status}`)
            }

            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error("Error populating ingredients:", error);
            setResult({error: "Failed to populate ingredients"});
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const ingredients = content
              .split("\n")
              .map(line => line.trim())
              .filter(line => line.length > 0);
            setCsvData(ingredients);
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-6 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Populate Ingredients</h1>

            {/* CSV upload */}
            <div className="mb-6">
                <label className="mb-6">
                    Upload CSV File:
                    <input 
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
                        file:text-sm file:font-semibold file:bg-blue50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                </label>
                {csvData.length > 0 && (
                    <div className="mt-2">
                        <p>Found {csvData.length} ingredients in file</p>
                        <button
                          onClick={() => handlePopulate(csvData)}
                          className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                            Import from File (new line separated)
                        </button>
                    </div>
                )}
            </div>

            {/* Default Ingredients */}
            <button
              onClick={() => handlePopulate(COMMON_INGREDIENTS)}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
                {isLoading ? "Processing..." : "Import Common Ingredients"}
            </button>

            {/* Results */}
            {result && (
                <div className="mt-4 p-4 bg-darkgrey rounded">
                    {result.error ? (
                        <p className="text-red-500">{result.error}</p>
                    ) : (
                        <>
                        <p className="text-green-600">{result.message}</p>
                        <div className="mt-2">
                            <p>Created: {result.created?.length || 0}</p>
                            <p>Skipped (already existed): {result.skipped?.length || 0}</p>
                        </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}