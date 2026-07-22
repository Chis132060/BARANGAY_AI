"use client";

import { ShieldAlert, LogIn, UserPlus, X } from "lucide-react";
import Link from "next/link";

interface GuestAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionTitle?: string;
}

export function GuestAuthModal({ isOpen, onClose, actionTitle = "Access Official Barangay Services" }: GuestAuthModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Resident Login Required</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-center space-y-2 py-1">
          <p className="text-xs font-bold text-gray-800">{actionTitle}</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            To request official certificates, file complaints, or submit applications, please sign in or register your verified resident account.
          </p>
        </div>

        <div className="space-y-2.5 pt-1">
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow transition-all"
          >
            <LogIn className="h-4 w-4" /> Sign In to Existing Account
          </Link>

          <Link
            href="/register"
            className="w-full flex items-center justify-center gap-2 py-3 border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-2xl text-xs font-bold transition-all"
          >
            <UserPlus className="h-4 w-4 text-blue-600" /> Register New Account
          </Link>
        </div>

        <button
          onClick={onClose}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600 font-semibold pt-1"
        >
          Continue Browsing as Guest
        </button>
      </div>
    </div>
  );
}
