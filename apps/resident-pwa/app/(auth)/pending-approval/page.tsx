import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Clock3, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = {
  title: "Pending Approval",
  description: "Resident account verification status.",
};

interface ResidentVerificationStatus {
  verification_status: "Pending" | "Verified" | "Rejected";
  rejection_reason: string | null;
}

async function getResidentStatus(): Promise<ResidentVerificationStatus | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("residents")
    .select("verification_status, rejection_reason")
    .eq("user_id", user.id)
    .maybeSingle();

  return data as ResidentVerificationStatus | null;
}

export default async function PendingApprovalPage() {
  const status = await getResidentStatus();
  const isRejected = status?.verification_status === "Rejected";
  const isVerified = status?.verification_status === "Verified";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 px-5 py-8">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-blue-100 space-y-5 text-center">
        <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center ${isRejected ? "bg-red-100 text-red-600" : isVerified ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
          {isRejected ? <AlertTriangle className="h-9 w-9" /> : isVerified ? <ShieldCheck className="h-9 w-9" /> : <Clock3 className="h-9 w-9" />}
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-extrabold text-gray-900">
            {isRejected ? "Registration rejected" : isVerified ? "Account verified" : "Account awaiting barangay verification"}
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            {isRejected
              ? "Your submitted resident registration needs correction before it can be approved."
              : isVerified
                ? "Your resident account is approved. You can now access Smart Barangay services."
                : "Barangay staff will review your details and uploaded ID before enabling resident services."}
          </p>
        </div>

        {isRejected && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">Reason</p>
            <p className="mt-1 text-sm text-red-800">
              {status?.rejection_reason || "No reason was recorded. Please contact the barangay office for assistance."}
            </p>
          </div>
        )}

        {!status && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Registration submitted</p>
            <p className="mt-1 text-sm text-amber-800">
              Sign in after confirming your email to view your live verification status.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {isVerified ? (
            <Link
              href="/home"
              className="block w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow hover:bg-blue-700"
            >
              Continue to Home
            </Link>
          ) : (
            <Link
              href="/login"
              className="block w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow hover:bg-blue-700"
            >
              Sign in to check again
            </Link>
          )}
          {status && <SignOutButton />}
        </div>
      </div>
    </main>
  );
}
