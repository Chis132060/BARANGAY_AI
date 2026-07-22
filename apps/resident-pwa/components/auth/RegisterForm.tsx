"use client";

import { useState } from "react";
import { User, MapPin, KeyRound, FileCheck, Upload, CheckCircle2, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PUROK_OPTIONS = ["Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6", "Purok 7"];
const ID_TYPE_OPTIONS = [
  "Philippine Identification (PhilID / ePhilID)",
  "Voter's ID / Voter's Certification",
  "Driver's License",
  "UMID / SSS / GSIS Card",
  "Postal ID",
  "Barangay Clearance / Proof of Residency",
];

export function RegisterForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    birthDate: "",
    gender: "Male",
    contactNumber: "",
    houseNumber: "",
    street: "",
    purok: "Purok 1",
    email: "",
    password: "",
    idType: ID_TYPE_OPTIONS[0],
    idPhotoUrl: "",
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewImage(base64);
        setFormData((prev) => ({ ...prev, idPhotoUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const supabase = createClient();

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Sign up user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw new Error(authError.message);

      // 2. Insert resident profile with Pending verification status
      const { error: resError } = await supabase.from("residents").insert({
        first_name: formData.firstName,
        middle_name: formData.middleName,
        last_name: formData.lastName,
        birth_date: formData.birthDate,
        gender: formData.gender,
        contact_number: formData.contactNumber,
        civil_status: "Single",
        verification_status: "Pending",
        id_type: formData.idType,
        id_photo_url: formData.idPhotoUrl || previewImage || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400",
      });

      if (resError) throw new Error(resError.message);

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center space-y-4 py-6 animate-in fade-in duration-300">
        <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Registration Submitted!</h2>
        <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
          Your resident account registration for <strong className="text-gray-900">{formData.firstName} {formData.lastName}</strong> has been submitted.
        </p>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-800 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <span>⏳ Status: Pending Barangay Verification</span>
          </p>
          <p className="text-[11px] leading-normal text-amber-700">
            Barangay Admin officials will verify your submitted ID against census records. You can sign in now to browse announcements, emergency hotlines, and chat with the AI assistant.
          </p>
        </div>
        <button
          onClick={() => (window.location.href = "/login")}
          className="w-full py-3 bg-blue-600 text-white font-bold text-xs rounded-xl shadow hover:bg-blue-700 transition-colors mt-2"
        >
          Proceed to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step Indicator */}
      <div className="flex items-center justify-between border-b pb-3 text-xs">
        <span className={`font-bold flex items-center gap-1.5 ${step === 1 ? "text-blue-600" : "text-gray-400"}`}>
          <User className="h-4 w-4" /> 1. Personal
        </span>
        <span className={`font-bold flex items-center gap-1.5 ${step === 2 ? "text-blue-600" : "text-gray-400"}`}>
          <MapPin className="h-4 w-4" /> 2. Address
        </span>
        <span className={`font-bold flex items-center gap-1.5 ${step === 3 ? "text-blue-600" : "text-gray-400"}`}>
          <KeyRound className="h-4 w-4" /> 3. Account
        </span>
        <span className={`font-bold flex items-center gap-1.5 ${step === 4 ? "text-blue-600" : "text-gray-400"}`}>
          <FileCheck className="h-4 w-4" /> 4. ID Verification
        </span>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
          {errorMsg}
        </div>
      )}

      {/* Step 1: Personal Identification */}
      {step === 1 && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Personal Information</h3>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
            <input
              type="text"
              required
              placeholder="Juan"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Middle Name</label>
              <input
                type="text"
                placeholder="Santos"
                value={formData.middleName}
                onChange={(e) => handleInputChange("middleName", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                placeholder="Dela Cruz"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={formData.birthDate}
                onChange={(e) => handleInputChange("birthDate", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange("gender", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile / Contact Number *</label>
            <input
              type="tel"
              required
              placeholder="09171234567"
              value={formData.contactNumber}
              onChange={(e) => handleInputChange("contactNumber", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            disabled={!formData.firstName || !formData.lastName || !formData.birthDate || !formData.contactNumber}
            onClick={() => setStep(2)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50 transition-all mt-4"
          >
            Next: Residency Address <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2: Residency Address */}
      {step === 2 && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Barangay Address</h3>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Purok / Zone *</label>
            <select
              value={formData.purok}
              onChange={(e) => handleInputChange("purok", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
            >
              {PUROK_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Street Name *</label>
            <input
              type="text"
              required
              placeholder="Rizal Street"
              value={formData.street}
              onChange={(e) => handleInputChange("street", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">House / Lot Number</label>
            <input
              type="text"
              placeholder="House # 123"
              value={formData.houseNumber}
              onChange={(e) => handleInputChange("houseNumber", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!formData.street}
              onClick={() => setStep(3)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50 transition-all"
            >
              Next: Account Info <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Account Credentials */}
      {step === 3 && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Account Credentials</h3>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              placeholder="juan@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[10px] text-gray-400 mt-1">Minimum 6 characters</p>
          </div>

          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!formData.email || formData.password.length < 6}
              onClick={() => setStep(4)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50 transition-all"
            >
              Next: Upload Valid ID <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Verification Proof & ID Upload */}
      {step === 4 && (
        <form onSubmit={handleRegisterSubmit} className="space-y-3.5 animate-in fade-in duration-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Barangay Resident Verification</h3>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Select Government ID Type *</label>
            <select
              value={formData.idType}
              onChange={(e) => handleInputChange("idType", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {ID_TYPE_OPTIONS.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Upload Photo of Valid ID *</label>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center hover:border-blue-500 transition-colors bg-gray-50">
              {previewImage ? (
                <div className="space-y-2">
                  <img src={previewImage} alt="ID Preview" className="h-32 object-cover rounded-lg mx-auto shadow-sm" />
                  <label className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer block">
                    Change ID Image
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer block space-y-2 py-2">
                  <Upload className="h-7 w-7 text-gray-400 mx-auto" />
                  <p className="text-xs font-semibold text-gray-600">Tap to Upload ID Photo</p>
                  <p className="text-[10px] text-gray-400">PNG, JPG, WEBP up to 5MB</p>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => setStep(3)}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Registration"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
