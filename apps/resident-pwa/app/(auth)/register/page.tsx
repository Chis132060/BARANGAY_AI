import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resident Registration",
  description: "Register as a verified Smart Barangay resident.",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-gray-100">
        <div className="flex flex-col items-center mb-6 text-center">
          <span className="text-3xl mb-1">🏛️</span>
          <h1 className="text-xl font-bold text-gray-900">Resident Registration</h1>
          <p className="text-xs text-gray-500 mt-1">Smart Barangay Online Services</p>
        </div>

        <RegisterForm />

        <p className="mt-6 text-center text-xs text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}

