"use client";

import { LoginForm } from "@/components/login-form";
import Link from "next/link";
import { Bot } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="flex flex-col items-center mb-8 text-center">
          <img src="/logo.png" alt="Smart Barangay Logo" className="h-16 w-auto mb-3 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Smart Barangay</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-600 font-medium hover:underline">
            Register
          </Link>
        </p>

        {/* Guest Mode Divider */}
        <div className="flex items-center gap-3 mt-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <Link
          href="/chat"
          className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-700 transition-all"
        >
          <Bot className="h-4 w-4 text-blue-500" />
          Continue as Guest (AI Chat Only)
        </Link>
      </div>
    </main>
  );
}

