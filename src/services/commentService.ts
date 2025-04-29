interface Comment {
    id: number
    text: string
    created_at: string
    updated_at?: string
    user_id: number
    recipe_id: string
    parent_id?: number
    username: string
    is_deleted: boolean
    replies: Comment[]
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const CommentService = {
    async getComments(recipeId: string, currentUserId?: number | null): Promise<Comment[]> {
        const response = await fetch(`${API_BASE_URL}/comments/${recipeId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch comments");
        }
        const data: Comment[] = await response.json()

        const addCanDelete = (comments: Comment[]): Comment[] => {
            return comments.map(comment => ({
                ...comment,
                canDelete: comment.user_id === currentUserId,
                replies: addCanDelete(comment.replies)
            }));
        }

        return currentUserId !== undefined && currentUserId !== null 
        ? addCanDelete(data)
        : data
    },

    async createComment(
        text: string,
        recipeId: string,
        parentId?: number,
        token?: string
    ) : Promise<Comment> {
        const response = await fetch(`${API_BASE_URL}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && {'Authorization': `Bearer ${token}`})
            },
            body: JSON.stringify({
                text,
                recipe_id: recipeId,
                parent_id: parentId
            })
        })

        if (!response.ok) {
            const errorData = await response.json();
            console.error('error details:', errorData)
            throw new Error(errorData.detail || 'Failed to create comment')
        }

        return response.json()
    },

    async updateComment(commentId: number, text: string, token: string): Promise<Comment> {
        const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        })

        if (!response.ok){
            throw new Error('Failed to update comment')
        }

        return response.json()
    },

    async deleteComment(commentId: number, hardDelete: boolean, token: string): Promise<void> {
        const endpoint = hardDelete ? `/comments/hard/${commentId}` : `/comments/soft/${commentId}`
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        if (!response.ok) {
            throw new Error('Failed to delete comment')
        }
    }
}