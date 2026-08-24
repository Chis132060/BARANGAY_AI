import { LoginForm } from "@/components/login-form";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 text-center">
          <img src="/logo.png" alt="Smart Barangay Logo" className="h-16 w-auto mb-3 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Smart Barangay</h1>
          <p className="text-gray-500 text-sm mt-0.5">Admin Portal</p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
