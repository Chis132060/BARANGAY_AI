"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayError = useMemo(() => {
    if (errorMsg) return errorMsg;
    if (urlError === "admin_account") {
      return "This is an administrator account. Please sign in to the Admin Portal instead.";
    }
    if (urlError === "role_lookup") {
      return "Unable to verify your account permissions. Please sign in again.";
    }
    if (urlError === "session_missing") {
      return "Your session has expired. Please sign in again.";
    }
    if (urlError === "auth_callback_failed") {
      return "Authentication could not be completed. Please try again.";
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

    // Map BRY- resident code → synthetic email; otherwise use as-is
    const authEmail = isResidentCode(values.username)
      ? residentCodeToEmail(values.username)
      : values.username.trim();
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: values.password,
      });
      if (error) {
        setErrorMsg(
          error.message === "Invalid login credentials"
            ? "Incorrect username or password. Please try again."
            : error.message === "fetch failed"
              ? "Cannot reach the sign-in service. Check your internet connection and try again."
              : error.message
        );
        setLoading(false);
        return;
      }

      // Check role resolution with fallback to user metadata
      const metaRole = (data.user.user_metadata?.role || data.user.app_metadata?.role) as string | undefined;
      const ADMIN_ROLES = new Set(["Super Admin", "Barangay Captain", "Secretary", "Treasurer", "Staff"]);

      let isAdmin = metaRole ? ADMIN_ROLES.has(metaRole) : false;

      if (!isAdmin) {
        const { data: userData } = await supabase
          .from("users")
          .select("role_id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (userData?.role_id) {
          const { data: roleData } = await supabase
            .from("roles")
            .select("name")
            .eq("id", userData.role_id)
            .maybeSingle();
          if (roleData?.name && ADMIN_ROLES.has(roleData.name)) {
            isAdmin = true;
          }
        }
      }

      if (isAdmin) {
        await supabase.auth.signOut();
        setErrorMsg("This is an admin account. Sign in to the Admin Portal instead.");
        setLoading(false);
        return;
      }

      if (!data.session) {
        setErrorMsg("Sign-in did not create an authenticated session.");
        setLoading(false);
        return;
      }

      window.location.replace("/home");
    } catch {
      setErrorMsg("Cannot reach the sign-in service. Check your internet connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {displayError && (
        <div className="p-3 text-xs bg-red-100 border border-red-200 text-red-700 rounded-lg font-medium">
          {displayError}
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
