"use client";

import { ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: {children: ReactNode}) {
    const API_URL = "http://localhost:8000"
    
    const { isAuthenticated, userId, userRole, isInitialising } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isInitialising) return;

        if (!isAuthenticated) {
            router.push("/login");
            return;
        }

        if (userRole !== "admin") {
            router.push("/");
            return;
        }
    }, [isAuthenticated, userRole, isInitialising]);

    if (isInitialising) {
        return <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>;
    }

    return <div className="admin-layout">{children}</div>;
}