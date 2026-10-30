import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Shield, Users, FileText, BarChart3 } from "lucide-react";
import { PreAuthWelcome } from "@/components/auth/PreAuthWelcome";

export default function LoginPage() {
  return (
    <PreAuthWelcome>
      <main className="min-h-screen flex bg-background">
        {/* Left Panel — Branding */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-12 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-white translate-x-32 -translate-y-32" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white -translate-x-16 translate-y-16" />
            <div className="absolute top-1/2 left-1/2 h-80 w-80 rounded-full bg-indigo-400 -translate-x-1/2 -translate-y-1/2" />
          </div>

          {/* Top Logo */}
          <div className="relative flex items-center gap-3">
            <img src="/logo.png" alt="Smart Barangay Logo" className="h-10 w-auto object-contain brightness-200" />
            <div>
              <p className="font-extrabold text-white text-base leading-none">Smart Barangay</p>
              <p className="text-blue-200 text-xs font-medium mt-0.5">Admin Management Portal</p>
            </div>
          </div>

          {/* Center Copy */}
          <div className="relative space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
                Barangay Operations,<br />
                <span className="text-blue-200">Simplified.</span>
              </h1>
              <p className="text-blue-100/80 text-sm leading-relaxed max-w-sm">
                Manage residents, process documents, track programs, and serve your community — all from one unified platform.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Users,     label: "Resident Registry",     desc: "Verified profiles & demographics" },
                { icon: FileText,  label: "Document Processing",   desc: "Certificates & clearances" },
                { icon: BarChart3, label: "Live Analytics",        desc: "Real-time barangay metrics" },
                { icon: Shield,    label: "Role-Based Access",     desc: "Secure staff permissions" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
                  <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-xs">{label}</p>
                    <p className="text-blue-200/70 text-[11px] leading-tight mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Quote */}
          <div className="relative border-t border-white/15 pt-5">
            <p className="text-blue-100/70 text-xs italic leading-relaxed">
              "Empowering local government units with modern, accessible, and efficient barangay management."
            </p>
          </div>
        </div>

        {/* Right Panel — Login Form */}
        <div className="flex flex-1 flex-col items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-sm">
            {/* Mobile Logo */}
            <div className="flex flex-col items-center mb-8 text-center lg:hidden">
              <img src="/logo.png" alt="Smart Barangay Logo" className="h-14 w-auto mb-3 object-contain" />
              <h1 className="text-xl font-bold text-foreground tracking-tight">Smart Barangay</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Admin Portal</p>
            </div>

            {/* Desktop Header */}
            <div className="mb-8 hidden lg:block">
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Welcome back</h2>
              <p className="text-muted-foreground text-sm mt-1">Sign in to your admin account to continue.</p>
            </div>

            <Suspense fallback={<div className="h-40 flex items-center justify-center text-xs text-muted-foreground">Loading sign in...</div>}>
              <LoginForm />
            </Suspense>

            <p className="text-center text-[11px] text-muted-foreground mt-6">
              Smart Barangay Admin Portal · Secure Access
            </p>
          </div>
        </div>
      </main>
    </PreAuthWelcome>
  );
}
