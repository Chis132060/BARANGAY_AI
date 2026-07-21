"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Full name must be at least 2 characters long"),
    email: z.string().trim().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
    roleName: z.enum(["Super Admin", "Barangay Captain", "Secretary", "Treasurer", "Staff"]),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupValues = z.infer<typeof signupSchema>;

const ROLE_OPTIONS: SignupValues["roleName"][] = [
  "Super Admin",
  "Barangay Captain",
  "Secretary",
  "Treasurer",
  "Staff",
];

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      roleName: "Staff",
    },
  });

  async function onSubmit(values: SignupValues) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const supabase = createClient();

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", values.roleName)
      .single();

    if (roleError || !role) {
      setErrorMsg(roleError?.message || "Selected admin role was not found.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          name: values.name,
          role: values.roleName,
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;

    if (!userId) {
      setSuccessMsg("Account created. Please check your email to confirm your account before signing in.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("users").insert({
      id: userId,
      name: values.name,
      email: values.email,
      role_id: role.id,
    });

    if (profileError) {
      setErrorMsg(`Account created, but admin profile setup failed: ${profileError.message}`);
      setLoading(false);
      return;
    }

    setSuccessMsg("Admin account created successfully. Redirecting to dashboard...");
    window.location.href = "/dashboard";
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errorMsg && (
        <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-medium">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-medium">
          {successMsg}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          disabled={loading}
          placeholder="Maria Santos"
          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          {...register("name")}
        />
        {errors.name && <p className="mt-1 text-xs text-destructive font-medium">{errors.name.message}</p>}
      </div>

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
        {errors.email && <p className="mt-1 text-xs text-destructive font-medium">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="roleName" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Admin Role
        </label>
        <select
          id="roleName"
          disabled={loading}
          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          {...register("roleName")}
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        {errors.roleName && <p className="mt-1 text-xs text-destructive font-medium">{errors.roleName.message}</p>}
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
            placeholder="Enter password"
            className="w-full rounded-lg border border-input bg-background pl-4 pr-10 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            {...register("password")}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-xs text-destructive font-medium">{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Confirm Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            disabled={loading}
            placeholder="Confirm password"
            className="w-full rounded-lg border border-input bg-background pl-4 pr-10 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            {...register("confirmPassword")}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowConfirmPassword((current) => !current)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-destructive font-medium">{errors.confirmPassword.message}</p>
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
            Creating Account...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Create Admin Account
          </>
        )}
      </button>
    </form>
  );
}
