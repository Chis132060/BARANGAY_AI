"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setErrorMsg(null);
    setLoading(true);

    const supabase = createClient();

    console.log("[LOGIN] Attempting sign in for:", values.email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    console.log("[LOGIN] Result:", { user: data?.user?.email, error: error?.message });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    console.log("[LOGIN] Success! Navigating to /dashboard...");
    window.location.href = "/dashboard";
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errorMsg && (
        <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-medium">
          {errorMsg}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          disabled={loading}
          placeholder="admin@barangay.gov"
          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          {...register("email")}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-destructive font-medium">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            disabled={loading}
            placeholder="••••••••"
            className="w-full rounded-lg border border-input bg-background pl-4 pr-10 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            {...register("password")}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowPassword((p) => !p)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-destructive font-medium">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-2.5 rounded-lg transition-all shadow disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing In...
          </>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}
