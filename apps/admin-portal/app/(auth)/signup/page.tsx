import { SignupForm } from "@/components/signup-form";
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Signup",
  description: "Create a Smart Barangay admin portal account.",
};

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-xl border border-border">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-3 shadow-md shadow-primary/20">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create Admin Account</h1>
          <p className="text-muted-foreground text-sm">Smart Barangay Admin Portal</p>
        </div>

        <SignupForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="text-primary font-semibold hover:underline">
            Sign In
          </a>
        </p>
      </div>
    </main>
  );
}
