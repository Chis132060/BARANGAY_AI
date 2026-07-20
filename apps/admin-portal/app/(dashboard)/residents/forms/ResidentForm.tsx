"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const residentFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
  birth_date: z.string().min(1, "Birth date is required"),
  gender: z.enum(["Male", "Female", "Other"]),
  civil_status: z.enum(["Single", "Married", "Widowed", "Divorced"]),
  contact_number: z.string().optional(),
  voter_status: z.boolean().default(false),
  senior_status: z.boolean().default(false),
  pwd_status: z.boolean().default(false),
  four_ps_status: z.boolean().default(false),
  house_number: z.string().optional(),
  street: z.string().optional(),
  purok: z.string().optional(),
});

type ResidentFormValues = z.infer<typeof residentFormSchema>;

interface ResidentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ResidentForm({ onSuccess, onCancel }: ResidentFormProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const supabase = createClient();
      const { data: resData, error: resError } = await supabase
        .from("residents")
        .insert({
          first_name: values.first_name,
          middle_name: values.middle_name,
          last_name: values.last_name,
          birth_date: values.birth_date,
          gender: values.gender,
          civil_status: values.civil_status,
          contact_number: values.contact_number,
          voter_status: values.voter_status,
          senior_status: values.senior_status,
          pwd_status: values.pwd_status,
          four_ps_status: values.four_ps_status,
        })
        .select("id")
        .single();

      if (resError) throw new Error(resError.message);

      if ((values.house_number || values.street || values.purok) && resData) {
        const { error: addrError } = await supabase
          .from("addresses")
          .insert({
            resident_id: resData.id,
            house_number: values.house_number,
            street: values.street,
            purok: values.purok,
          });
          
        if (addrError) console.error("Address error:", addrError.message);
      }

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create resident profile.");
    } finally {
      setLoading(false);
    }
  }

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
