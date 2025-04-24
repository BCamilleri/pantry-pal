import { useAuth } from '@/context/AuthContext';

const API_URL = "http://localhost:8000";

export const useCompatibilityService = () => {
    const { isAuthenticated, userId } = useAuth();
    
    const getCompatibleGroups = async (ingredients: string[]) => {
        if (!isAuthenticated || !userId) {
            throw new Error('User not authenticated');
        }

        try {
            const response = await fetch(`${API_URL}/compatibility`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    ingredients: ingredients
                })
            });

            if (response.status === 401) {
                // token may be expired
                localStorage.removeItem('token');
                throw new Error('Session expired. Please log in again.')
            }

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || JSON.stringify(errorData));
                } catch (jsonError) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }

            return await response.json();
        } catch (error) {
            console.error("Error getting compatible groups:", error);
            throw error;
        }
    };

    return { getCompatibleGroups };
};