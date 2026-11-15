import Link from "next/link";
import { fetchJoinApplications } from "./actions";
import { JoinRequestsClient } from "./JoinRequestsClient";

export default async function OrganizationJoinRequestsPage() {
  try {
    const requests = await fetchJoinApplications();
    return (
      <div className="mx-auto max-w-5xl space-y-5 p-6">
        <Link href="/organizations" className="text-sm font-semibold text-blue-700 underline">Back to Organizations</Link>
        <div><h1 className="text-2xl font-bold">Organization Join Requests</h1>
          <p className="mt-1 text-sm text-slate-600">Residents are not members until authorized staff approves their application.</p>
        </div>
        <JoinRequestsClient initialRequests={requests}/>
      </div>
    );
  } catch (error) {
    return <div role="alert" className="mx-auto max-w-4xl rounded-xl border border-red-200 bg-red-50 p-6">
      <h1 className="text-xl font-bold text-red-900">Unable to load membership applications</h1>
      <p className="mt-2 text-sm text-red-800">{error instanceof Error ? error.message : "Try again later."}</p>
      <Link href="/organizations" className="mt-3 inline-block text-sm font-semibold text-blue-700 underline">Back to Organizations</Link>
    </div>;
  }
}
