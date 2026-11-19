"use client";

import { useEffect, useState } from "react";
import { User, MapPin, KeyRound, FileCheck, Upload, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Clock, Camera, Home, AlertTriangle, Users, Paperclip, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerResidentAction } from "@/app/(auth)/register/actions";
import CameraCapture from "../camera/CameraCapture";

const PUROK_OPTIONS = ["Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6", "Purok 7"];
const ID_TYPE_OPTIONS = [
  "Philippine Identification (PhilID / ePhilID)",
  "Voter's ID / Voter's Certification",
  "Driver's License",
  "UMID / SSS / GSIS Card",
  "Postal ID",
  "Barangay ID",
  "Barangay Clearance / Proof of Residency",
];

export function RegisterForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
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
    householdCode: "",
    email: "",
    password: "",
    confirmPassword: "",
    idType: ID_TYPE_OPTIONS[0],
    isBoarder: false,
    boarderCount: "",
  });

  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [selfieWithIdBlob, setSelfieWithIdBlob] = useState<Blob | null>(null);
  const [idPreviewUrl, setIdPreviewUrl] = useState<string | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isTakingSelfie, setIsTakingSelfie] = useState(false);
  const [idPhotoConfirmed, setIdPhotoConfirmed] = useState(false);
  const [selfiePhotoConfirmed, setSelfiePhotoConfirmed] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [rbiFile, setRbiFile] = useState<File | null>(null);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) && formData.email.length <= 254;
  const passwordValid = formData.password.length >= 12 && formData.password.length <= 128;
  const passwordMatches = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const credentialsValid = emailValid && passwordValid && passwordMatches;

  // These previews contain sensitive photos. Revoke temporary URLs on retake
  // and unmount instead of creating a new URL on each render.
  useEffect(() => {
    if (!capturedBlob) { setIdPreviewUrl(null); return; }
    const url = URL.createObjectURL(capturedBlob);
    setIdPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [capturedBlob]);
  useEffect(() => {
    if (!selfieWithIdBlob) { setSelfiePreviewUrl(null); return; }
    const url = URL.createObjectURL(selfieWithIdBlob);
    setSelfiePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selfieWithIdBlob]);

  const handleInputChange = (field: string, value: string) => {
    setErrorMsg(null);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCaptureStart = () => setIsCapturing(true);
  const handleCaptureCancel = () => setIsCapturing(false);
  const handleCapture = (blob: Blob) => {
    setCapturedBlob(blob);
    setIdPhotoConfirmed(false);
    setSelfieWithIdBlob(null);
    setSelfiePhotoConfirmed(false);
    setIsCapturing(false);
  };
  const handleSelfieCapture = (blob: Blob) => {
    setSelfieWithIdBlob(blob);
    setSelfiePhotoConfirmed(false);
    setIsTakingSelfie(false);
  };

  const supabase = createClient();

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialsValid) {
      setStep(3);
      setErrorMsg("Enter a valid email and a matching password of 12–128 characters before ID verification.");
      return;
    }
    if (!capturedBlob || !selfieWithIdBlob || !idPhotoConfirmed || !selfiePhotoConfirmed || !privacyAcknowledged) {
      setErrorMsg("Capture your valid ID and a separate selfie holding the same ID, then confirm both photos and the privacy notice.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, String(value));
      });
      if (capturedBlob) payload.append("idBlob", capturedBlob, "id_capture.jpg");
      if (selfieWithIdBlob) payload.append("selfieWithIdBlob", selfieWithIdBlob, "selfie_with_id.jpg");
      payload.append("privacyAcknowledged", String(privacyAcknowledged));
      payload.append("idPhotoConfirmed", String(idPhotoConfirmed));
      payload.append("selfiePhotoConfirmed", String(selfiePhotoConfirmed));
      if (rbiFile) {
        payload.append("rbiFile", rbiFile, rbiFile.name);
      }

      const res = await registerResidentAction(payload);

      if (res.error) {
        throw new Error(res.error);
      }

      setSubmitted(true);
      if (res.emailWarning) {
        setEmailWarning(res.emailWarning);
      } else {
        window.location.href = "/pending-approval";
      }
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
        {emailWarning && <p role="alert" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">{emailWarning}</p>}
        <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
          Your resident account registration for <strong className="text-gray-900">{formData.firstName} {formData.lastName}</strong> has been submitted.
        </p>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-800 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Status: Pending Barangay Verification</span>
          </p>
          <p className="text-[11px] leading-normal text-amber-700">
            Barangay Admin officials will verify your submitted ID against barangay records. Full resident access unlocks after approval.
          </p>
        </div>
        <button
          onClick={() => (window.location.href = "/pending-approval")}
          className="w-full py-3 bg-blue-600 text-white font-bold text-xs rounded-xl shadow hover:bg-blue-700 transition-colors mt-2"
        >
          View Approval Status
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {/* Step Indicator */}
      <div className="grid grid-cols-4 gap-1 border-b pb-3 text-[10px] min-[390px]:text-xs">
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
              className="min-h-12 w-full min-w-0 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange("gender", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* 6-month residency notice */}
          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700 leading-relaxed">
              <span className="font-bold">Residency Requirement:</span> You must have resided in this barangay for at least <strong>6 months</strong> to be eligible for resident registration. Your submitted ID and profiling information will be verified by the Barangay.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Purok / Zone *</label>
            <select
              value={formData.purok}
              onChange={(e) => handleInputChange("purok", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold"
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
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">House / Lot Number</label>
            <input
              type="text"
              placeholder="House # 123"
              value={formData.houseNumber}
              onChange={(e) => handleInputChange("houseNumber", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Household code (optional)</label>
            <input
              type="text"
              placeholder="Ask your household head or Barangay staff"
              value={formData.householdCode}
              onChange={(e) => handleInputChange("householdCode", e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-[10px] text-gray-500">If staff already added your family record, this helps connect your PWA account to it after your details are verified.</p>
          </div>

          {/* Boarder Profiling */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isBoarder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isBoarder: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded accent-blue-600"
              />
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5 text-gray-500" /> I am a boarder / renter in this barangay
              </span>
            </label>

            {formData.isBoarder ? (
              <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    <span className="font-bold">Boarder Profiling Required:</span> The barangay requires a profiling of all individuals residing in a boarding house. Please provide the total number of boarders and attach your RBI (Record of Barangay Inhabitants).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Total Boarders in Boarding House *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={formData.boarderCount}
                    onChange={(e) => handleInputChange("boarderCount", e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Count yourself and all co-boarders individually.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" /> Attach RBI (Record of Barangay Inhabitants) *
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png"
                      onChange={(e) => setRbiFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className={`flex items-center gap-2 p-2.5 rounded-xl border border-dashed transition-colors ${
                      rbiFile ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-blue-400 bg-white'
                    }`}>
                      <Paperclip className={`h-4 w-4 shrink-0 ${rbiFile ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <span className={`text-[11px] truncate flex-1 ${rbiFile ? 'text-emerald-700 font-medium' : 'text-gray-500'}`}>
                        {rbiFile ? rbiFile.name : "Tap to attach RBI document…"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Accepted: PDF, JPG, PNG. Max 5MB.</p>
                </div>
              </div>
            ) : null}
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
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="registration-password" className="mb-1 block text-sm font-semibold text-gray-700">Create password *</label>
            <div className="relative">
              <input id="registration-password" type={showPassword ? "text" : "password"}
                autoComplete="new-password" minLength={12} maxLength={128} required
                aria-invalid={formData.password.length > 0 && !passwordValid}
                value={formData.password}
                onChange={e => handleInputChange("password", e.target.value)}
                className="min-h-12 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 pr-12 text-base outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="At least 12 characters" />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(value => !value)}
                className="absolute inset-y-0 right-0 flex min-h-11 w-12 items-center justify-center text-gray-600">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p role="status" className={`mt-1 text-xs ${passwordValid ? "text-emerald-700" : "text-slate-600"}`}>
              {passwordValid ? "✓ Password length is valid (12–128 characters)." : `Use 12–128 characters. Current length: ${formData.password.length}.`}
            </p>
          </div>
          <div>
            <label htmlFor="registration-confirm-password" className="mb-1 block text-sm font-semibold text-gray-700">Confirm password *</label>
            <div className="relative">
              <input id="registration-confirm-password" type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password" minLength={12} maxLength={128} required
                aria-invalid={formData.confirmPassword.length > 0 && !passwordMatches}
                value={formData.confirmPassword}
                onChange={e => handleInputChange("confirmPassword", e.target.value)}
                className="min-h-12 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 pr-12 text-base outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type the same password again" />
              <button type="button" aria-label={showConfirmPassword ? "Hide confirmation" : "Show confirmation"}
                onClick={() => setShowConfirmPassword(value => !value)}
                className="absolute inset-y-0 right-0 flex min-h-11 w-12 items-center justify-center text-gray-600">
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {formData.confirmPassword && (
              <p role="status" className={`mt-1 text-xs ${passwordMatches ? "text-emerald-700" : "text-red-700"}`}>
                {passwordMatches ? "✓ Passwords match." : "Passwords must match before continuing."}
              </p>
            )}
          </div>
          {!emailValid && formData.email.length > 0 && <p role="alert" className="text-xs text-red-700">Enter a valid email address.</p>}
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
              disabled={!credentialsValid}
              onClick={() => setStep(4)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50 transition-all"
            >
              Next: ID & Selfie Verification <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Verification Proof & ID Upload */}
      {step === 4 && (
        <form onSubmit={handleRegisterSubmit} className="space-y-3.5 animate-in fade-in duration-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Barangay Resident Verification</h3>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-950">
            Your ID photo and a separate selfie holding the same ID are used for manual barangay review. A photo upload is not automatic identity approval.
          </div>
          <div>
            <label htmlFor="registration-id-type" className="mb-1 block text-sm font-semibold text-gray-700">Select ID or residency document type *</label>
            <select id="registration-id-type" value={formData.idType}
              onChange={e => { handleInputChange("idType", e.target.value); setIdPhotoConfirmed(false); }}
              className="min-h-12 w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500">
              {ID_TYPE_OPTIONS.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">Accepted for preliminary review: National ID (card/paper/digital), driver's license, voter ID/certification, Postal ID, SSS/GSIS/UMID, Barangay ID or local barangay clearance. All documents require staff verification.</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">1. Capture your identification document *</label>
            <div className="min-w-0 overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-2 text-center min-[375px]:p-3">
              {isCapturing ? (
                <CameraCapture key="id-proof" facingMode="environment"
                  instruction="Fill the frame with the full ID or official document. Keep all text readable."
                  onCapture={handleCapture} onCancel={handleCaptureCancel} />
              ) : capturedBlob && idPreviewUrl ? (
                <div className="space-y-2">
                  <img src={idPreviewUrl} alt="ID photo preview before submission" className="mx-auto max-h-40 w-auto max-w-full rounded-lg object-contain" />
                  <button type="button" onClick={handleCaptureStart}
                    className="min-h-11 rounded-xl px-3 text-sm font-semibold text-blue-700">Retake ID photo</button>
                </div>
              ) : (
                <button type="button" onClick={handleCaptureStart} className="flex min-h-24 w-full flex-col items-center justify-center gap-2">
                  <Camera className="h-7 w-7 text-blue-700" aria-hidden="true" />
                  <span className="text-sm font-semibold">Open rear camera to photograph ID</span>
                </button>
              )}
            </div>
            {capturedBlob && <label className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-slate-700">
              <input type="checkbox" checked={idPhotoConfirmed} onChange={e => setIdPhotoConfirmed(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
              I confirm this is my selected valid ID or barangay document, fully visible and readable. I understand staff will review it.
            </label>}
          </div>
          {capturedBlob && <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">2. Take a selfie while holding the same ID *</label>
            <p className="mb-2 text-xs leading-relaxed text-slate-600">Use your front camera. Keep your face and the ID visible and readable together, with no filters or other people. Take a new photo; do not reuse the ID-only image.</p>
            <div className="min-w-0 overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-2 text-center min-[375px]:p-3">
              {isTakingSelfie ? (
                <CameraCapture key="selfie-proof" facingMode="user"
                  instruction="Show your face and hold your ID beside it, both in the same frame."
                  imageAlt="Selfie holding identification document"
                  onCapture={handleSelfieCapture} onCancel={() => setIsTakingSelfie(false)} />
              ) : selfieWithIdBlob && selfiePreviewUrl ? (
                <div className="space-y-2">
                  <img src={selfiePreviewUrl} alt="Selfie with ID preview before submission" className="mx-auto max-h-48 w-auto max-w-full rounded-lg object-contain" />
                  <button type="button" onClick={() => setIsTakingSelfie(true)}
                    className="min-h-11 rounded-xl px-3 text-sm font-semibold text-blue-700">Retake selfie with ID</button>
                </div>
              ) : (
                <button type="button" onClick={() => setIsTakingSelfie(true)}
                  className="flex min-h-24 w-full flex-col items-center justify-center gap-2">
                  <Camera className="h-7 w-7 text-blue-700" aria-hidden="true" />
                  <span className="text-sm font-semibold">Open front camera: selfie + ID</span>
                </button>
              )}
            </div>
            {selfieWithIdBlob && <label className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-slate-700">
              <input type="checkbox" checked={selfiePhotoConfirmed} onChange={e => setSelfiePhotoConfirmed(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
              My own face and the same ID are visible in this selfie. This proof will be checked by authorized barangay staff.
            </label>}
          </div>}
          <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
            <input type="checkbox" checked={privacyAcknowledged} onChange={e => setPrivacyAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0" />
            I acknowledge that my ID and selfie photos will be stored in a private verification bucket and reviewed by authorized staff to assess my resident account. This is not automatic face matching. I may contact barangay support about privacy, access and retention.
          </label>
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
              disabled={loading || !credentialsValid || !capturedBlob || !selfieWithIdBlob || !idPhotoConfirmed || !selfiePhotoConfirmed || !privacyAcknowledged}
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
