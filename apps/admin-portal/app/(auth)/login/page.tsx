import { LoginForm } from "@/components/login-form";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md p-8 bg-card rounded-2xl shadow-xl border border-border">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-3 shadow-md shadow-primary/20">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Smart Barangay</h1>
          <p className="text-muted-foreground text-sm">Admin Portal</p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
