import { NotificationOnboarding } from "@/components/onboarding/NotificationOnboarding";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Clock3, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import { RefreshStatusButton } from "./refresh-status-button";

export const metadata: Metadata = {
  title: "Pending Approval",
  description: "Resident account verification status.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ResidentVerificationStatus {
  verification_status: "Pending" | "Verified" | "Rejected";
  rejection_reason: string | null;
}

type StatusIssue = "signed_out" | "lookup_failed" | "record_missing";

async function getResidentStatus(): Promise<{
  status: ResidentVerificationStatus | null;
  issue: StatusIssue | null;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: null, issue: "signed_out" };

  const { data, error } = await supabase
    .from("residents")
    .select("verification_status, rejection_reason")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load resident verification status:", error.message);
    return { status: null, issue: "lookup_failed" };
  }
  if (!data) return { status: null, issue: "record_missing" };

  return { status: data as ResidentVerificationStatus, issue: null };
}

export default async function PendingApprovalPage() {
  const { status, issue } = await getResidentStatus();
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
            {isRejected
              ? "Registration rejected"
              : isVerified
                ? "Account verified"
                : issue === "signed_out"
                  ? "Sign in to check your status"
                  : issue === "lookup_failed"
                    ? "Verification status unavailable"
                    : issue === "record_missing"
                      ? "Resident profile not found"
                      : "Account awaiting barangay verification"}
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            {isRejected
              ? "Your submitted resident registration needs correction before it can be approved."
              : isVerified
                ? "Your resident account is approved. You can now access Smart Barangay services."
                : issue === "signed_out"
                  ? "Your verification status is only available after you sign in. If you have confirmed your email, sign in to continue."
                  : issue === "lookup_failed"
                    ? "We could not retrieve your resident record right now. Refresh to try again, or contact barangay support if this continues."
                    : issue === "record_missing"
                      ? "We could not find a resident profile linked to this account. Contact barangay support so staff can check the account link."
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

        {issue && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
              {issue === "signed_out"
                ? "No signed-in session"
                : issue === "lookup_failed"
                  ? "Could not check status"
                  : "Account link needs review"}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              {issue === "signed_out"
                ? "Sign in after confirming your email to view your live verification status."
                : issue === "lookup_failed"
                  ? "Your verification status was not changed. Please retry the lookup."
                  : "Your account may be active, but its resident profile is not linked."}
            </p>
          </div>
        )}

        <NotificationOnboarding />
        <div className="space-y-3">
          {isVerified ? (
            <Link
              href="/home"
              className="block w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow hover:bg-blue-700"
            >
              Continue to Home
            </Link>
          ) : issue === "signed_out" ? (
            <Link
              href="/login"
              className="block w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow hover:bg-blue-700"
            >
              Sign in to continue
            </Link>
          ) : (
            <RefreshStatusButton />
          )}
          {(status || issue === "record_missing" || issue === "lookup_failed") && <Link href="/support" className="block text-sm font-semibold text-blue-700 underline">Need help? Submit a support ticket</Link>}
          {(status || issue === "record_missing" || issue === "lookup_failed") && <SignOutButton />}
        </div>
      </div>
    </main>
  );
}
