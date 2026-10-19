"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Eye, EyeOff } from "lucide-react";

const RESIDENT_CODE_DOMAIN = "smartbarangay.local";

/** Converts a BRY- resident code to its synthetic auth email */
function residentCodeToEmail(code: string): string {
  return `${code.trim().toLowerCase()}@${RESIDENT_CODE_DOMAIN}`;
}

/** Returns true if the input looks like a resident code (e.g. BRY-2026-00001) */
function isResidentCode(value: string): boolean {
  return /^BRY-\d{4}-\d+$/i.test(value.trim());
}

const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Please enter your email or Resident Code")
    .refine(
      (val) => isResidentCode(val) || z.string().email().safeParse(val).success,
      { message: "Enter a valid email address or Resident Code (e.g. BRY-2026-00001)" }
    ),
  password: z.string().min(1, "Password is required"),
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
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setErrorMsg(null);
    setLoading(true);

    const supabase = createClient();

    // Map BRY- resident code → synthetic email; otherwise use as-is
    const authEmail = isResidentCode(values.username)
      ? residentCodeToEmail(values.username)
      : values.username.trim();

    console.log("[LOGIN] Attempting sign in for:", authEmail);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: values.password,
    });

    console.log("[LOGIN] Result:", { user: data?.user?.email, error: error?.message });

    if (error) {
      setErrorMsg(
        error.message === "Invalid login credentials"
          ? "Incorrect username or password. Please try again."
          : error.message
      );
      setLoading(false);
      return;
    }

    console.log("[LOGIN] Success! Navigating to /home...");
    window.location.href = "/home";
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errorMsg && (
        <div className="p-3 text-xs bg-red-100 border border-red-200 text-red-700 rounded-lg font-medium">
          {errorMsg}
        </div>
      )}

      <div>
        <label
          htmlFor="username"
          className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
        >
          Email or Resident Code
        </label>
        <input
          id="username"
          type="text"
          disabled={loading}
          placeholder="you@example.com or BRY-2026-00001"
          className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-50"
          {...register("username")}
        />
        {errors.username && (
          <p className="mt-1 text-xs text-red-600 font-medium">{errors.username.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            disabled={loading}
            placeholder="••••••••"
            className="w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-4 pr-11 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-50"
            {...register("password")}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowPassword((p) => !p)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-red-600 font-medium">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-blue-500/10 disabled:opacity-50 text-sm mt-2"
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
