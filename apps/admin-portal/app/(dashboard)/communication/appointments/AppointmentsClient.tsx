"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  X,
  CalendarDays,
  Clock,
  User,
} from "lucide-react";

type Status = "Pending" | "Approved" | "Cancelled" | "Completed";

export interface AppointmentRow {
  id: string;
  type: string;
  schedule_date: string;
  status: Status;
  resident: { first_name: string; last_name: string } | null;
}

export interface ResidentOption { id: string; first_name: string; last_name: string }

interface Props {
  appointments: AppointmentRow[];
  residents: ResidentOption[];
  onCreate: (input: { resident_id: string; type: string; schedule_date: string }) => Promise<{ success: boolean }>;
  onStatusChange: (id: string, status: Status) => Promise<{ success: boolean }>;
}

const APPOINTMENT_TYPES = [
  "Business Clearance Interview",
  "Document Pickup",
  "Barangay Hall Consultation",
  "Mediation / Lupon Hearing",
  "Health / Medical Assistance",
  "Other",
];

const STATUS_STYLES: Record<Status, string> = {
  Pending:   "bg-amber-100 text-amber-700 border-amber-200",
  Approved:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  Completed: "bg-blue-100 text-blue-700 border-blue-200",
  Cancelled: "bg-gray-100 text-gray-400 border-gray-200",
};

const STATUS_DOT: Record<Status, string> = {
  Pending:   "bg-amber-400",
  Approved:  "bg-emerald-500",
  Completed: "bg-blue-500",
  Cancelled: "bg-gray-300",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const inputClass = "mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";
const labelClass = "block text-xs font-semibold text-muted-foreground";

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function AppointmentsClient({ appointments, residents, onCreate, onStatusChange }: Props) {
  const today = new Date();

  // Calendar state
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);

  // Modal state
  const [open, setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm]   = useState({ resident_id: "", type: APPOINTMENT_TYPES[0], customType: "", when: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Detail panel: selected appointment
  const [detailAppt, setDetailAppt] = useState<AppointmentRow | null>(null);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startOffset = first.getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    // Pad to full weeks
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  // Group appointments by day key
  const apptsByDay = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const a of appointments) {
      const d = new Date(a.schedule_date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [appointments]);

  function dayKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

  const selectedDayAppts = useMemo(() => {
    if (!selectedDay) return [];
    return (apptsByDay.get(dayKey(selectedDay)) || []).sort(
      (a, b) => new Date(a.schedule_date).getTime() - new Date(b.schedule_date).getTime()
    );
  }, [selectedDay, apptsByDay]);

  // Matches for resident search in modal
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return residents.filter((r) => !term || `${r.first_name} ${r.last_name}`.toLowerCase().includes(term));
  }, [residents, search]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function openModal(prefillDate?: Date) {
    const base = prefillDate ?? new Date();
    const next = new Date(base);
    if (!prefillDate) { next.setDate(next.getDate() + 1); }
    next.setHours(9, 0, 0, 0);
    setForm({ resident_id: "", type: APPOINTMENT_TYPES[0], customType: "", when: toLocalInputValue(next) });
    setSearch("");
    setError("");
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const type = form.type === "Other" ? form.customType.trim() : form.type;
    if (!form.resident_id) { setError("Select a resident."); return; }
    if (!type) { setError("Describe the purpose of the appointment."); return; }
    if (!form.when) { setError("Pick a date and time."); return; }
    setSaving(true); setError("");
    try {
      await onCreate({ resident_id: form.resident_id, type, schedule_date: new Date(form.when).toISOString() });
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Unable to schedule appointment");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: Status) {
    setBusyId(id);
    try {
      await onStatusChange(id, status);
      // Update detailAppt in place if open
      if (detailAppt?.id === id) setDetailAppt({ ...detailAppt, status });
      window.location.reload();
    } catch (err: any) {
      window.alert(err.message || "Unable to update appointment");
      setBusyId(null);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resident appointments. Staff can also book on behalf of residents who can&apos;t use the app.
          </p>
        </div>
        <button
          onClick={() => openModal(selectedDay ?? undefined)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95"
        >
          <Plus className="h-4 w-4" /> Schedule Appointment
        </button>
      </div>

      {/* Calendar + Side panel */}
      <div className="flex gap-4 items-start">

        {/* ── Calendar ── */}
        <div className="flex-1 min-w-0 rounded-2xl border bg-card shadow-sm overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
            <button onClick={prevMonth} className="rounded-lg p-1.5 hover:bg-muted transition-colors" title="Previous month">
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <h2 className="text-base font-bold tracking-tight">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-muted transition-colors" title="Next month">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b bg-muted/20">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 divide-x divide-y border-b">
            {calendarDays.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="h-28 bg-muted/10" />;
              }
              const key = dayKey(day);
              const dayAppts = apptsByDay.get(key) || [];
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              const isPast = day < today && !isToday;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  className={`h-28 flex flex-col p-1.5 cursor-pointer transition-colors overflow-hidden
                    ${isSelected ? "bg-primary/8 ring-2 ring-inset ring-primary/40" : "hover:bg-muted/30"}
                    ${isPast ? "opacity-60" : ""}
                  `}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday ? "bg-primary text-primary-foreground" : isSelected ? "text-primary" : "text-foreground"}`}>
                      {day.getDate()}
                    </span>
                    {dayAppts.length > 0 && (
                      <span className="text-[9px] font-bold text-muted-foreground">{dayAppts.length}</span>
                    )}
                  </div>

                  {/* Appointment pills (max 3, then overflow) */}
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {dayAppts.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-semibold truncate border ${STATUS_STYLES[a.status]}`}
                      >
                        <span className={`shrink-0 h-1.5 w-1.5 rounded-full ${STATUS_DOT[a.status]}`} />
                        <span className="truncate">
                          {a.resident ? `${a.resident.last_name}` : "Resident"}
                        </span>
                      </div>
                    ))}
                    {dayAppts.length > 2 && (
                      <div className="text-[9px] font-semibold text-muted-foreground pl-1">
                        +{dayAppts.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-6 py-3 text-[11px] text-muted-foreground bg-muted/10">
            {(["Pending","Approved","Completed","Cancelled"] as Status[]).map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* ── Side panel: selected day ── */}
        <div className="w-72 shrink-0 rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b px-4 py-3 bg-muted/20 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold">
              {selectedDay
                ? selectedDay.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })
                : "Select a day"}
            </span>
          </div>

          {!selectedDay ? (
            <p className="p-6 text-xs text-center text-muted-foreground">Click a day on the calendar to view appointments.</p>
          ) : selectedDayAppts.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-xs text-muted-foreground">No appointments on this day.</p>
              <button
                onClick={() => openModal(selectedDay)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add appointment
              </button>
            </div>
          ) : (
            <ul className="divide-y max-h-[560px] overflow-y-auto">
              {selectedDayAppts.map((a) => {
                const time = new Date(a.schedule_date).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
                return (
                  <li
                    key={a.id}
                    onClick={() => setDetailAppt(a)}
                    className="px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {a.resident ? `${a.resident.first_name} ${a.resident.last_name}` : "Resident"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{a.type}</p>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {time}
                        </div>
                      </div>
                      <span className={`shrink-0 mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[a.status]}`}>
                        {a.status}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Appointment Detail Modal ── */}
      {detailAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setDetailAppt(null)}>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base">Appointment Details</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{detailAppt.type}</p>
              </div>
              <button onClick={() => setDetailAppt(null)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="rounded-xl border bg-muted/20 divide-y text-sm">
              <div className="flex items-center gap-3 px-4 py-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-semibold">
                  {detailAppt.resident ? `${detailAppt.resident.first_name} ${detailAppt.resident.last_name}` : "Resident"}
                </span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{new Date(detailAppt.schedule_date).toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" })}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
              <select
                value={detailAppt.status}
                disabled={busyId === detailAppt.id}
                onChange={(e) => changeStatus(detailAppt.id, e.target.value as Status)}
                className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 ${STATUS_STYLES[detailAppt.status]}`}
              >
                {(["Pending","Approved","Completed","Cancelled"] as Status[]).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {busyId === detailAppt.id && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1 border-t">
              <button onClick={() => setDetailAppt(null)} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule Appointment Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">Schedule Appointment</h2>
                <p className="text-xs text-muted-foreground">Booked by staff on behalf of a resident. Saved as Approved.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}

            <div>
              <span className={labelClass}>Resident</span>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setForm({ ...form, resident_id: "" }); }}
                  placeholder="Search verified resident by name"
                  className="w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <select
                required
                size={Math.min(5, Math.max(2, matches.length))}
                value={form.resident_id}
                onChange={(e) => setForm({ ...form, resident_id: e.target.value })}
                aria-label="Matching residents"
                className="mt-2 w-full rounded-xl border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                {matches.length === 0 && <option value="" disabled>No matching verified residents</option>}
                {matches.map((r) => <option key={r.id} value={r.id}>{r.last_name}, {r.first_name}</option>)}
              </select>
            </div>

            <label className={labelClass}>
              Purpose
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                {APPOINTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            {form.type === "Other" && (
              <label className={labelClass}>
                Describe purpose
                <input
                  required
                  maxLength={50}
                  value={form.customType}
                  onChange={(e) => setForm({ ...form, customType: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. Barangay ID follow-up"
                />
              </label>
            )}

            <label className={labelClass}>
              Date &amp; time
              <input
                type="datetime-local"
                required
                min={toLocalInputValue(new Date())}
                max="2100-12-31T23:59"
                value={form.when}
                onChange={(e) => setForm({ ...form, when: e.target.value })}
                className={inputClass}
              />
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
              <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Schedule
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
