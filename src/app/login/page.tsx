"use client"

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { handleClientScriptLoad } from "next/script";
import { useRouter } from "next/router";

export default function Page() {

  const backendUrl = "http://127.0.0.1:8000";

  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(backendUrl + "/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const token = data.access_token;
        login(token);
        window.location.href = "/";
      } else {
        setError(data.detail || "Login failed");
      }
    } catch (error) {
      console.error(error)
      setError("Error occured while logging in");
    }
  }
 
  return (
    <div className="text-black flex items-center mt-10 justify-center px-4">
      <form className="w-full max-w-md bg-white rounded-xl shadow-md shadow-darkgrey p-6 sm:p-10 md:p-12" onSubmit={submit}>
        <div className="">
          {/* Username */}
          <div className="mb-4">
            <label>Username</label>
            <input 
              className="mt-1 w-full bg-lightgrey rounded-md shadow shadow-black px-3 py-2"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label>Password</label>
            <input 
              className="mt-1 w-full bg-lightgrey rounded-md shadow shadow-black px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Submit */}
          <div className="mb-4">
            <button className="w-full px-6 py-3 text-white font-semibold rounded-lg bg-gradient-to-r from-myorange to-deepred shadow-md transition-colors" type="submit">Login</button>
          </div>

          {/* Forgot Password and Create Account */}
          <div className="text-sm text-center flex justify-between">
            <p className="text-myblue hover:underline cursor-pointer">Forgot Password?</p>
            <Link href="/createAccount" className="text-myblue hover:underline cursor-pointer">Create Account</Link>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 text-red-600 text-sm text-center">
              <p>{error}</p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};