"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Please enter your username or email"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayError = useMemo(() => {
    if (errorMsg) return errorMsg;
    if (urlError === "unauthorized") {
      return "This account does not have administrator privileges. Please sign in with an authorized admin account.";
    }
    if (urlError === "role_lookup") {
      return "Unable to verify your administrator permissions. Please sign in again.";
    }
    if (urlError === "session_missing") {
      return "Your session has expired. Please sign in again.";
    }
    if (urlError === "auth_callback_failed") {
      return "Sign-in authentication could not be completed. Please try again.";
    }
    return null;
  }, [errorMsg, urlError]);

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

    const loginEmail = values.username.trim().toLowerCase() === "admin"
      ? "admin@barangay.gov"
      : values.username.trim();

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: values.password,
      });
      if (error) {
        setErrorMsg(error.message === "fetch failed"
          ? "Cannot reach the sign-in service. Check your internet connection and try again."
          : error.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        setErrorMsg("Sign-in did not create an authenticated session.");
        setLoading(false);
        return;
      }

      // The browser client has persisted the returned session. Navigate now;
      // don't call getSession() here because it can stall sign-in completion.
      window.location.replace("/dashboard");
    } catch {
      setErrorMsg("Cannot reach the sign-in service. Check your internet connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {displayError && (
        <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-medium">
          {displayError}
        </div>
      )}

      <div>
        <label htmlFor="username" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Username or Email
        </label>
        <input
          id="username"
          type="text"
          disabled={loading}
          placeholder="Admin"
          className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-50"
          {...register("username")}
        />
        {errors.username && (
          <p className="mt-1 text-xs text-red-600 font-medium">{errors.username.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
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
