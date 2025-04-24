import React, { ChangeEvent, ReactNode } from "react";


// Reusable Input element

interface InputProps {
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    className?: string;
}

export function Input({type="text", placeholder, value, onChange, className=""} : InputProps) {
    return (
        <input 
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className={`shadow-md border rounded-xl px-3 py-2 w-full border-3 border-[2px] border-black ${className}`}
        />
    );
}

// Reusable Button element

interface ButtonProps {
    onClick?: () => void;
    disabled?: boolean;
    children: ReactNode;
    className?: string;
}

export function Button({ onClick, disabled, children, className=""} : ButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`disabled:deepred text-white px-4 py-2 rounded-xl bg-gradient-to-r from-darkgrey to-darkgrey shadow-md hover:from-myorange hover:to-deepred ${className}`}
        >
            {children}
        </button>
    );
}

// Reusable Card component
interface CardProps {
    children: ReactNode;
    className?: string;
}

export function Card({ children, className=""} : CardProps) {
    return <div className={`rounded-lg p-4 ${className}`}>{children}</div>;
}

export function CardContent({ children, className=""} : CardProps) {
    return <div className={`p-4 ${className}`}>{children}</div>;
}
