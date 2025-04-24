import { useAuth } from '@/context/AuthContext';

const API_URL = "http://localhost:8000";

export const usePantryService = () => {
    const { isAuthenticated } = useAuth();

    const getPantryItems = async (userId: number) => {
        try {
            const response = await fetch(`${API_URL}/pantry?user_id=${userId}`, 
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch pantry items');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching pantry:', error);
            throw error;
        }
    };

    const addPantryItem = async (userId: number, ingredientId: number) => {
        try {
            const response = await fetch(`${API_URL}/pantry/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    user_id: userId,
                    ingredient_id: ingredientId
                })
            });

            const responseClone = response.clone();

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    console.error('API ERROR:', {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorData
                    });
                    throw new Error(errorData.detail || errorData.message || `Failed to add pantry item. Status ${response.status}`);                    
                } catch (jsonError) {
                    const errorText = await responseClone.text();
                    console.error(`API ERROR (text fallback):`, {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText
                    });
                    throw new Error(`Failed to add pantry item: ${errorText}`);
                }


            }

        } catch (error) {
            const errorMessage = error instanceof Error 
            ? error.message 
            : 'Failed to add pantry item';
        console.error('Error adding to pantry:', errorMessage, error);
        throw new Error(errorMessage);
        }
    };

    const searchIngredients = async (query: string) => {
        try {
            const response = await fetch(`${API_URL}/ingredients/search?q=${query}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to search ingredients');
            }

            return await response.json();
        } catch (error) {
            console.error('Error searching ingredients: ', error);
            throw error;
        }
    };

    const removePantryItem = async (pantryId: number) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No auth token found');

            const response = await fetch(`${API_URL}/pantry/${pantryId}`, {
                method: 'DELETE',
                headers: {
                    // 'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Failed to remove item (Status ${response.status})`);
                } catch (jsonError) {
                    throw new Error(`Failed to remove item: ${response.statusText}`);
                }
            }

            // if (response.status === 204){
            //     return { success: true };
            // }
            return { success: true };
            
            return await response.json();
        } catch (error) {
            console.error('Error removing pantry item:', error);
            throw error instanceof Error ? error : new Error('Failed to remove item');
        }
    };

    return {
        getPantryItems,
        addPantryItem,
        searchIngredients,
        removePantryItem
    }

};