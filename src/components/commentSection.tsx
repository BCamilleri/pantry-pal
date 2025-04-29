"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui';
import { formatDistanceToNow } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { CommentService } from '@/services/commentService';
import Image from "next/image";
import { setMaxIdleHTTPParsers } from 'http';


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
    canDelete?: boolean
}

export function CommentSection({ recipeId }: { recipeId: string }) {
    const { isAuthenticated, userId } = useAuth();
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState('');
    const [replyText, setReplyText] = useState('');
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchComments = async () => {
            try {
                setLoading(true);
                const comments = await CommentService.getComments(recipeId, userId || undefined);
                setComments(comments);
            } catch (error) {
                setError(error instanceof Error ? error.message : 'Failed to get comments');
            } finally {
                setLoading(false);
            }
        }

        fetchComments()

    }, [recipeId, isAuthenticated, userId]);

    const handleDelete = async (commentId: number) => {
        const token = localStorage.getItem("token");
        if (!token) { 
            setError("You must be logged in to delete comments");
            return;
        }
        try {
            if (!window.confirm("Are you sure you want to delete this?")) {
                return;
            }
            await CommentService.deleteComment(commentId, false, token)
            
            // recursive function to navigate comment-reply tree
            const removeComment = (comments: Comment[]): Comment[] => {
                return comments.filter(
                    comment => comment.id !== commentId
                ).map(
                    comment => ({
                        ...comment,
                        replies: removeComment(comment.replies)
                    })
                );
            }

            setComments(prevComments => removeComment(prevComments));

        } catch (error) {
            console.error("Failed to delete comment", error);
            setError(error instanceof Error ? error.message : "Failed to delete comment")
        }
    };

    const handleSubmit = async (e: React.FormEvent, isReply = false) => {
        e.preventDefault()
        const token = localStorage.getItem("token");
        const commentText = isReply ? replyText : newComment;
        console.log(commentText);

        if (!commentText.trim()) {
            setError('Comment cannot be empty');
            return;
        }

        if (!isAuthenticated || !token) {
            setError('You must be logged in to comment');
            return;
        }

        try {
            setError(null);

            const createdComment = await CommentService.createComment(
                commentText, 
                recipeId,
                replyingTo || undefined,
                token
            );

            if (replyingTo) {
                setComments(prevComments => 
                    prevComments.map(comment => 
                        comment.id === replyingTo
                        ? {
                            ...comment,
                            replies: [...comment.replies, createdComment]
                        }
                        : comment
                    )
                );
                setReplyText('');
            } else {
                setComments(prevComments => [createdComment, ...prevComments]);
                setNewComment('');
            }

            // reset form
            setNewComment('');
            setReplyingTo(null);
        } catch (error) {
            console.error("Failed to post comment", error);
            setError(error instanceof Error ? error.message : 'Failed to post comment')
        }
    };

    const renderComment = (comment: Comment, depth = 0): React.ReactNode => {
        const MAX_DEPTH = 6;
        if (depth > MAX_DEPTH) return null;
        console.log('Raw timestamp: ', comment.created_at);
        console.log('Parsed date: ', new Date(comment.created_at));
        
        return (
            <div
            key={comment.id}
            className={`mt-4 ${depth > 0 ? 'ml-8 border-l-2 border-darkgrey pl-4' : ''}`}
            style={{marginLeft: `${depth * 10}px`}}
            >
                <div className='flex items-start gap-3'>
                    {/* Avatar - temp image for now, or X if account deleted */}
                    <div className=''>
                        {comment.is_deleted ? (
                            'X'
                        ) : (
                            <Image 
                              src="/tempAvatar.png"
                              alt="User Avatar"
                              width={30}
                              height={30}
                              className="rounded-full border-2 border-gray-300"
                            />
                        )}
                    </div>
                    <div className='flex-1'>
                        {comment.is_deleted ? (
                            <div className='text-gray-500 italic'>[deleted]</div>
                        ) : (
                            <>
                                <div className='flex items-center gap-2'>
                                    <span className='font-semibold'>{comment.username}</span>
                                    <span className='text-sm text-gray-500'>
                                        {formatDistanceToNow(new Date(comment.created_at), {addSuffix: true, includeSeconds: true})}
                                    </span>
                                    {comment.canDelete && (
                                        <button
                                          onClick={() => handleDelete(comment.id)}
                                          className='text-sm text-deepred hover:underline'
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                                <p className='mt-1 whitespace-pre-line'>{comment.text}</p>
                                {isAuthenticated && (
                                    <button
                                    onClick={() => {setReplyingTo(comment.id); setError(null);}}
                                    className='text-sm text-myblue hover:underline mt-1'
                                    >
                                        Reply
                                    </button>
                                )}
                            </>
                        )}
                        {replyingTo === comment.id && (
                            <form onSubmit={(e) => handleSubmit(e, true)} className='mt-2'>
                                <textarea 
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Reply..."
                                  className='mb-2'
                                />
                                <div className='flex gap-2'>
                                    <button type="submit" className=''>Post</button>
                                    <button
                                      type="button"
                                      onClick={() => setReplyingTo(null)}
                                      className=''
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
                {comment.replies.map(reply => renderComment(reply, depth+1))}
            </div>
        )
    };
    
    if (loading) {
        return <div className='text-center py-4'>Loading comments...</div>
    }

    return (
        <div className='mt-8'>
            <h2 className='text-2xl font-bold mb-4'>Comments</h2>
            {error && (
                <div className='mb-4 p-2 text-red-500 bg-red-50 rounded'>
                    {error}
                </div>
            )}
            {isAuthenticated && (
                <form onSubmit={(e) => handleSubmit(e, false)} className='mb-6'>
                    <textarea 
                      value={newComment}
                      onChange={(e) => {
                        if (!replyingTo) {
                            setNewComment(e.target.value)
                        }
                      }}
                      placeholder='Comment...'
                    />
                    <button type='submit' className='mt-2'>Post</button>
                </form>
            )}
            {comments.length === 0 ? (
                <p className='text-gray-500'>No comments yet.</p>
            ) : (
                <div>
                    {comments.map(comment => renderComment(comment))}
                </div>
            )}
        </div>
    )

    

}