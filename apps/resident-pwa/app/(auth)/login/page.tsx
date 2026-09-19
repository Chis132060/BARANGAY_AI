"use client";

import { LoginForm } from "@/components/login-form";
import Link from "next/link";
import { PreAuthWelcome } from "@/components/auth/PreAuthWelcome";

export default function LoginPage() {
  return (
    <PreAuthWelcome>
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
            className="mt-5 w-full flex items-center justify-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-left transition-all hover:border-blue-400 hover:bg-blue-50/40"
          >
            <img
              src="/ate-sora.svg"
              alt="Ate Sora"
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-blue-100"
            />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-gray-800">Continue as Guest</span>
              <span className="mt-0.5 block text-[11px] font-medium text-gray-500">Chat with Ate Sora · AI Chat Only</span>
            </span>
          </Link>
        </div>
      </main>
    </PreAuthWelcome>
  );
}

