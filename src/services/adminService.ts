import { ApiError } from "next/dist/server/api-utils";

const API_URL = "http://localhost:8000";

export const populateIngredients = async (ingredients: string[], token: string) => {
    try {
        const response = await fetch(`${API_URL}/ingredients/bulk/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                body: JSON.stringify({ingredients})
            }
        });

        if (!response.ok) throw new Error("Failed to populate ingredients.");
        return await response.json();
    } catch (error) {
        console.error("Admin service error:", error);
        throw error;
    }
};

export const verifyAdmin = async (token: string) => {
    try {
        const response = await fetch(`${API_URL}/verifyAdmin`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        return response.ok;
    } catch (error) {
        console.error("Admin verification error:", error);
        return false;
    }
};