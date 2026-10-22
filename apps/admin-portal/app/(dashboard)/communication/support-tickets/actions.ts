"use server";
import { createClient } from "@/lib/supabase/server";
import { checkUserPermission } from "../../administration/rbac-actions";
import { revalidatePath } from "next/cache";

export type TicketStatus = "Submitted" | "In Review" | "Resolved" | "Closed";
const validStatuses: TicketStatus[] = ["Submitted", "In Review", "Resolved", "Closed"];

async function authorizedStaff(canEdit = false) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id,"communication",canEdit?"canEdit":"canView")))
    throw new Error("Not authorized to manage support tickets.");
  return { supabase, user };
}

export async function fetchSupportTickets() {
  const { supabase } = await authorizedStaff();
  const { data, error } = await supabase.from("support_tickets")
    .select("id,resident_user_id,category,subject,description,status,staff_reply,created_at,updated_at")
    .order("created_at",{ascending:false}).limit(200);
  if (error) throw new Error("Unable to load tickets: "+error.message);
  return data || [];
}

export async function updateSupportTicket(id: string,status: TicketStatus,reply: string) {
  const { supabase,user } = await authorizedStaff(true);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !validStatuses.includes(status) || reply.length>4000)
    throw new Error("Invalid ticket update.");
  const { data, error } = await supabase.from("support_tickets")
    .update({status,staff_reply:reply.trim()||null,assigned_staff_id:user.id,updated_at:new Date().toISOString()})
    .eq("id",id).select("id,resident_user_id,subject,status").maybeSingle();
  if(error || !data) throw new Error("Could not update ticket; check staff permissions and RLS.");
  const { error: notificationError } = await supabase.from("notifications").insert({
    user_id:data.resident_user_id,
    title:"Support ticket update",
    message:"Your support ticket '"+data.subject.slice(0,80)+"' is now "+data.status+".",
    read_status:false
  });
  if(notificationError) console.error("Ticket updated; notification delivery failed:",notificationError.message);
  revalidatePath("/communication/support-tickets");
  return {success:true, notificationSent:!notificationError};
}
