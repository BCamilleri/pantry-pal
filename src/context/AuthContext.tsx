"use client"

import { decode } from 'punycode';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { json } from 'stream/consumers';

type UserRole = "admin" | "regular";

interface AuthContextType {
    isAuthenticated: boolean;
    userId: number | null;
    userRole: UserRole | null;
    isInitialising: boolean;
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

interface DecodedToken {
  userId: number;
  role: UserRole;
  sub: string;
  exp: number;
  iat?: number;
  iss?: string;
}

const decodeToken = (token: string): DecodedToken | null => {
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

    const userId = decoded.user_id || decoded.userId;
    const role = decoded.role?.toLowerCase();

    if (!userId || !role || !decoded.sub) {
      console.error("Invalid token structure - missing fields", decoded);
      return null;
    }

    if (role !== "admin" && role !== "regular") {
      console.error("Invalid role value:", role);
      return null;
    }

    return {
      userId: Number(userId),
      role: role as UserRole,
      sub: decoded.sub,
      exp: decoded.exp,
      iat: decoded.iat,
      iss: decoded.iss
    };
  } catch (error) {
    console.error("Token decoding failed:", error)
    return null;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<"admin" | "regular" | null>(null);
    const [isInitialising, setIsInitialising] = useState(true)
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
      setHasMounted(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        setIsInitialising(false);
        return;
      }

      const decoded = decodeToken(token);
      if (decoded) {
        const isExpired = decoded.exp && (Date.now() >= decoded.exp * 1000 - 5000);
        if (isExpired) {
          localStorage.removeItem("token");
        } else {
          setIsAuthenticated(true);
          setUserId(decoded.userId);
          setUserRole(decoded.role);
        }
      }
      setIsInitialising(false);
    }, []);
  
    const login = (token: string) => {
      try {
        console.log("saving token")
        localStorage.setItem("token", token);

        const savedToken = localStorage.getItem("token");
        if (savedToken !== token) {
          throw new Error("Token verification failed")
        }
        const decoded = decodeToken(token);
        if (decoded) {
          localStorage.setItem("token", token);
          
          setIsAuthenticated(true);
          setUserId(decoded.userId);
          setUserRole(decoded.role);
          
          console.log("Login successful - token saved"); 
        }
      } catch (error) {
        console.error("Login error:", error);
        localStorage.removeItem("token"); // Clean up on error
      }
    };
  
    const logout = () => {
      setIsAuthenticated(false);
      setUserId(null);
      setUserRole(null);
      localStorage.removeItem("token"); // Remove token on logout
    };
  
    if (!hasMounted || isInitialising) {
      return <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>;
    }

    return (
      <AuthContext.Provider value={{ 
        isAuthenticated, 
        userId, 
        userRole,
        isInitialising,
        login, 
        logout 
      }}>
        {children}
      </AuthContext.Provider>
    );
};
  
  // Custom hook to use auth context
  export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
      throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
  };