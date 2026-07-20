import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Register as a Smart Barangay resident.",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-800 px-6 py-10">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-sm text-gray-500 mt-1">Register as a barangay resident</p>
        </div>

        {/* TODO: Replace with <RegisterForm /> — full name, address, phone, password, ID upload */}
        <div className="space-y-4">
          <div>
            <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="full-name"
              type="text"
              placeholder="Juan dela Cruz"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            Create Account
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 font-medium hover:underline">
            Sign In
          </a>
        </p>
      </div>
    </main>
  );
}
