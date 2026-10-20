"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Loader2, Mail, CheckCircle2, PrinterIcon } from "lucide-react";
import { createResidentWithCredentials } from "../actions/createResidentWithCredentials";

const residentFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
  birth_date: z.string().min(1, "Birth date is required"),
  gender: z.enum(["Male", "Female", "Other"]),
  civil_status: z.enum(["Single", "Married", "Widowed", "Divorced"]),
  contact_number: z.string().optional(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  voter_status: z.boolean().default(false),
  senior_status: z.boolean().default(false),
  pwd_status: z.boolean().default(false),
  four_ps_status: z.boolean().default(false),
  house_number: z.string().trim().optional(),
  street: z.string().trim().min(1, "Street is required"),
  purok: z.string().trim().min(1, "Purok is required"),
});

type ResidentFormValues = z.infer<typeof residentFormSchema>;

interface ResidentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ResidentForm({ onSuccess, onCancel }: ResidentFormProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    residentCode: string;
    emailSent: boolean;
    hasEmail: boolean;
    generatedPassword?: string;
    firstName: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResidentFormValues>({
    resolver: zodResolver(residentFormSchema),
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      birth_date: "",
      gender: "Male",
      civil_status: "Single",
      contact_number: "",
      email: "",
      voter_status: false,
      senior_status: false,
      pwd_status: false,
      four_ps_status: false,
      house_number: "",
      street: "",
      purok: "",
    },
  });

  async function onSubmit(values: ResidentFormValues) {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await createResidentWithCredentials({
        ...values,
        email: values.email?.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error ?? "Failed to create resident profile.");
        return;
      }

      setResult({
        residentCode: res.residentCode,
        emailSent: res.emailSent,
        hasEmail: !!values.email?.trim(),
        generatedPassword: res.generatedPassword,
        firstName: values.first_name,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create resident profile.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="space-y-5 bg-card p-6 border rounded-2xl shadow-sm max-w-2xl mx-auto">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <h2 className="text-xl font-bold">Resident Registered!</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            The resident profile has been created and their login account is ready.
          </p>
        </div>

        {/* Email delivered */}
        {result.emailSent && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <Mail className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Credentials emailed ✓</p>
              <p className="text-xs text-green-700 mt-0.5">
                Login credentials have been sent to the resident's email address. They can log in using their email and the password from the email.
              </p>
            </div>
          </div>
        )}

        {/* No email — show printable credential card */}
        {!result.hasEmail && result.generatedPassword && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <PrinterIcon className="h-4 w-4" />
              <p className="text-xs font-bold uppercase tracking-wide">Print and hand this to the resident</p>
            </div>

            {/* Printable card */}
            <div
              id="credential-card"
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-white print:border-solid print:border-black"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Smart Barangay</p>
                  <p className="text-lg font-bold text-gray-900">Login Credentials</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
              </div>

              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Resident Name</p>
                  <p className="text-base font-bold text-gray-900">{result.firstName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Username</p>
                  <p className="text-xl font-mono font-bold text-blue-700">{result.residentCode}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Password</p>
                  <p className="text-xl font-mono font-bold text-gray-900 tracking-widest">{result.generatedPassword}</p>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 mt-3 text-center">
                Login at your Barangay's resident portal. Keep this slip private.
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition-all"
            >
              <PrinterIcon className="h-4 w-4" />
              Print Credential Slip
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2 border-t">
          <button
            type="button"
            onClick={onSuccess}
            className="px-6 py-2 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground shadow"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-card p-6 border rounded-2xl shadow-sm max-w-2xl mx-auto">
      <h2 className="text-xl font-bold border-b pb-3 mb-2">Register Resident Profile</h2>

      {errorMsg && (
        <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-lg font-medium">
          {errorMsg}
        </div>
      )}

      {/* Name Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">First Name</label>
          <input
            type="text"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...register("first_name")}
          />
          {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Middle Name</label>
          <input
            type="text"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...register("middle_name")}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Last Name</label>
          <input
            type="text"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...register("last_name")}
          />
          {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name.message}</p>}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Birth Date</label>
          <input
            type="date"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...register("birth_date")}
          />
          {errors.birth_date && <p className="text-xs text-destructive mt-1">{errors.birth_date.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gender</label>
          <select
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...register("gender")}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Civil Status</label>
          <select
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...register("civil_status")}
          >
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Divorced">Divorced</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Contact Number</label>
          <input
            type="text"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...register("contact_number")}
          />
        </div>
      </div>

      {/* Email — optional */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
          Email Address{" "}
          <span className="normal-case font-normal text-muted-foreground/70">(optional — credentials will be emailed if provided)</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="email"
            placeholder="resident@example.com"
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...register("email")}
          />
        </div>
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
        <p className="text-xs text-muted-foreground mt-1">
          If left blank, a Resident Code (e.g. BRY-2026-00142) will be generated as the login username. Admin should print and hand it to the resident.
        </p>
      </div>

      {/* Address Block */}
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-t pt-4">Address Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">House Number</label>
          <input
            type="text"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...register("house_number")}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Street</label>
          <input
            type="text"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...register("street")}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Purok</label>
          <input
            type="text"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...register("purok")}
          />
        </div>
      </div>

      {/* Classifications / Flags */}
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-t pt-4">Classifications</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
          <input type="checkbox" className="rounded border-input text-primary focus:ring-primary h-4 w-4" {...register("voter_status")} />
          <span>Voter Status</span>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
          <input type="checkbox" className="rounded border-input text-primary focus:ring-primary h-4 w-4" {...register("senior_status")} />
          <span>Senior Citizen</span>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
          <input type="checkbox" className="rounded border-input text-primary focus:ring-primary h-4 w-4" {...register("pwd_status")} />
          <span>PWD Status</span>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
          <input type="checkbox" className="rounded border-input text-primary focus:ring-primary h-4 w-4" {...register("four_ps_status")} />
          <span>4Ps Member</span>
        </label>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <button
          type="button"
          disabled={loading}
          onClick={onCancel}
          className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-accent border border-border text-muted-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground shadow"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Profile
        </button>
      </div>
    </form>
  );
}
