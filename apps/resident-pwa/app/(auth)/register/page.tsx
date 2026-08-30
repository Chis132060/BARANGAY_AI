import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resident Registration",
  description: "Register as a verified Smart Barangay resident.",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <img src="/logo.png" alt="Smart Barangay Logo" className="h-16 w-auto mb-3 object-contain" />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Resident Registration</h1>
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

