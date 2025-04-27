"use client"

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from "next/link"
import { cursorTo } from 'readline';
import { form } from 'framer-motion/client';
import { fdatasync } from 'fs';

type UserData = {
    id: number;
    username: string;
    email: string;
};

export default function AccountPage() {

    const { isAuthenticated, userId, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        currentPassword: '',
        newPassword: ''
    });
    const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

    const apiUrl = "http://127.0.0.1:8000";
    
    // code is the same as in AuthContext.ts
    const tokenExpired = (token: string | null): boolean => {
        if (!token) return true;
        try {
            // split JWT into header | payload | signature
            // and take payload as base64url
            const base64Url = token.split('.')[1];
            // replace URL-safe chars
            // - i.e. convert to standard base64 for easy decoding
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, '/');
            // decode to a json string
            const jsonPayload = decodeURIComponent(
                atob(base64) // decode into binary string
                .split('') // split into characters
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)) // convert to %-encoded hex
                .join('') // combine into URI endoded string
            );
            const decoded = JSON.parse(jsonPayload);
            return decoded.exp && (Date.now() >= decoded.exp * 1000);
        } catch {
            return true;
        }
    };

    useEffect(() => {
        if (isAuthenticated && userId) {
            fetchUserData();
        }
    }, [isAuthenticated, userId]);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            if (!token || tokenExpired(token)) {
                logout();
                return;
            }

            const response = await fetch(`${apiUrl}/users/${userId}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
            });

            // unauthorised 
            if (response.status === 401)  {
                logout();
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to fetch user data");
            }

            const data = await response.json();
            setUserData(data);
            setFormData({
                username: data.username,
                email: data.email,
                currentPassword: '',
                newPassword: ''
            });
        } catch (error) {
            console.error("Error fetching user data:", error);
            setMessage({text: "Failed to load user data", type: "error"});
            logout();
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (token) {
                await fetch(`${apiUrl}/logout/`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            }
            localStorage.removeItem("token");
            logout();
        } catch (error) {
            console.error("Error logging out:", error);
        } finally {
            setLoading(false);
        }
        
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error("No auth token");

            const payload: any = {};

            if (formData.username !== userData?.username) {
                payload.username = formData.username;
            }
            if (formData.email !== userData?.email) {
                payload.email = formData.email;
            }
            if (formData.newPassword) {
                payload.current_password = formData.currentPassword;
                payload.new_password = formData.newPassword;
            }
            else if (formData.email !== userData?.email && formData.currentPassword) {
                payload.current_password = formData.currentPassword;
            }

            const response = await fetch(`${apiUrl}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to update user');
            }

            const updatedUser = await response.json();
            setUserData(updatedUser);
            setEditMode(false);
            setMessage({text: 'Profile updated', type: 'success'});
        } catch (error) {
            if (error instanceof Error && error.message.includes("Incorrect current password")) {
                setMessage({text: "Incorrect Current Password", type: 'error'});
            } else {
                //console.error("Error updating user:", error);
                setMessage({text: error instanceof Error ? error.message : 'Failed to update profile', type: 'error'});
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return <div className="p-4">You are not logged in. Click <Link href="/login" className="text-blue-600 hover:underline">here</Link> to login.</div>;
    }

    return (
        <div className="mt-5 max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6">Account Details</h1>

            {message && (
                <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            {!editMode && userData ? (
                <div className="space-y-4">
                    <div>
                        <h2 className="font-semibold">Username</h2>
                        <p>{userData.username}</p>
                    </div>
                    <div>
                        <h2 className="font-semibold">Email</h2>
                        <p>{userData.email}</p>
                    </div>
                    <div className="flex gap-2 pt-4 justify-between">
                        <button
                          onClick={() => setEditMode(true)}
                          className="px-4 py-2 bg-gradient-to-r from-myorange to-orange-600 text-white rounded hover:bg-bl"
                        >
                            Edit Profile
                        </button>
                        <button
                          onClick={handleLogout}
                          disabled={loading}
                          className="px-4 py-2 bg-gradient-to-r from-orange-600 to-deepred text-white rounded hover:bg-gray-700"
                        >
                            {loading ? "Logging out..." : "Logout"}
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor='username' className='block font-medium mb-1'>Username</label>
                        <input
                          type="text"
                          id="username"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                        />
                    </div>
                    <div>
                        <label htmlFor='email' className='block font-medium mb-1'>Email</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                        />
                    </div>
                    <div>
                        <label htmlFor="currentPassword" className="block font-medium mb-1">Current Password (to change)</label>
                        <input
                          type="password"
                          id="currentPassword"
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                          placeholder="Leave blank to keep current password"
                        />
                    </div>
                    {formData.currentPassword && (
                        <div>
                            <label htmlFor='newPassword' className='block font-medium mb-1'>New Password</label>
                            <input
                              type="password"
                              id="newPassword"
                              name="newPassword"
                              value={formData.newPassword}
                              onChange={handleInputChange}
                              className="w-full p-2 border rounded"
                            />
                        </div>
                    )}
                    <div className="flex gap-2 pt-2 justify-between">
                        <button
                          type='submit'
                          disabled={loading}
                          className='px-4 py-2 bg-myblue text-white rounded hover:bg-blue-600'
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditMode(false);
                            setMessage(null);
                          }}
                          className='px-4 py-2 bg-darkgrey text-white rounded hover:bg-gray-700'
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
  }