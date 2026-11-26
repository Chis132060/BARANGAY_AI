import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resident Registration",
  description: "Register as a verified Smart Barangay resident.",
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-[100dvh] min-w-0 flex-col items-center justify-start bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center mb-6 text-center">
          <img src="/logo.png" alt="Smart Barangay Logo" className="h-16 w-auto mb-3 object-contain" />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight sm:text-3xl">Resident Registration</h1>
          <p className="text-sm text-slate-600 mt-1">Smart Barangay Online Services</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8"><RegisterForm /></div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}

