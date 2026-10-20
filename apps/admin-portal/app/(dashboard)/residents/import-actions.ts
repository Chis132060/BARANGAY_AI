"use server";

import { createClient } from "@/lib/supabase/server";
import { checkUserPermission } from "../administration/rbac-actions";

export interface ResidentImportRow {
  first_name: string;
  middle_name?: string;
  last_name: string;
  birth_date: string;
  gender: "Male" | "Female" | "Other";
  civil_status: "Single" | "Married" | "Widowed" | "Divorced";
  contact_number?: string;
  house_number?: string;
  street: string;
  purok: string;
}

export async function importResidents(rows: ResidentImportRow[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "residents", "canCreate"))) {
    throw new Error("Insufficient permissions to import residents");
  }
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 200) throw new Error("Import requires 1–200 rows");
  const genders = new Set(["Male", "Female", "Other"]);
  const statuses = new Set(["Single", "Married", "Widowed", "Divorced"]);
  for (const [index, row] of rows.entries()) {
    if (!row.first_name?.trim() || !row.last_name?.trim() || !row.street?.trim() || !row.purok?.trim()
      || !/^\d{4}-\d{2}-\d{2}$/.test(row.birth_date) || Number.isNaN(Date.parse(row.birth_date))
      || !genders.has(row.gender) || !statuses.has(row.civil_status)) {
      throw new Error(`Invalid resident at row ${index + 2}`);
    }
  }
  // The SQL function inserts the batch and addresses in one database transaction.
  const { data, error } = await supabase.rpc("import_barangay_residents", { p_rows: rows });
  if (error) throw new Error(error.message);
  return { imported: Number(data ?? rows.length) };
}
