"use client";

import { useState } from "react";
import type { AnnouncementItem } from "../../actions";
import { Plus, Megaphone, X, Sparkles, Loader2, Check, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AnnouncementListProps {
  announcements: AnnouncementItem[];
}

export function AnnouncementList({ announcements: initialAnnouncements }: AnnouncementListProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(initialAnnouncements);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  async function optimizeImage(file: File): Promise<File> {
    if (file.size <= 900 * 1024 && file.type === "image/webp") return file;
    const bitmap = await createImageBitmap(file);
    const maxSize = 1600;
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.78));
    return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" }) : file;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      let image_url: string | null = null;
      if (imageFile) {
        const optimizedImage = await optimizeImage(imageFile);
        if (supabase.storage?.from) {
          const safeName = optimizedImage.name.replace(/[^a-zA-Z0-9.-]/g, "-");
          const path = `${Date.now()}-${safeName}`;
          const upload = await supabase.storage.from("announcement-images").upload(path, optimizedImage, { upsert: false, contentType: optimizedImage.type, cacheControl: "31536000" });
          if (upload.error) throw new Error(upload.error.message);
          image_url = supabase.storage.from("announcement-images").getPublicUrl(path).data.publicUrl;
        } else {
          // Local mock mode has no object storage; keep the preview so the
          // announcement flow remains testable without Supabase Storage.
          image_url = imagePreview;
        }
      }

      const { data, error } = await supabase
        .from("announcements")
        .insert({
          title,
          description,
          category,
          published_by: user?.id || null,
          status: "Published",
          published_date: new Date().toISOString(),
          image_url,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      const newAnn: AnnouncementItem = {
        id: data.id,
        title: data.title,
        description: data.description,
        category: data.category,
        status: "Published",
        published_date: data.published_date,
        image_url: data.image_url,
        author: { name: user?.email?.split("@")[0] || "Barangay Official" },
      };

      setAnnouncements([newAnn, ...announcements]);
      setTitle("");
      setDescription("");
      setShowModal(false);
      setImageFile(null);
      setImagePreview(null);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to publish announcement.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Barangay Announcements</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Publish community news, health advisories, and emergency alerts to all citizens via PWA.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all"
        >
          <Plus className="h-4 w-4" />
          Publish Announcement
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          Announcement successfully published to all resident PWA feeds!
        </div>
      )}

      {/* Announcements Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {announcements.length === 0 ? (
          <div className="col-span-full border border-dashed rounded-2xl p-10 text-center bg-card shadow-xs text-muted-foreground font-medium">
            <Megaphone className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            No announcements published yet. Click "Publish Announcement" above.
          </div>
        ) : (
          announcements.map((ann) => (
            <div key={ann.id} className="bg-card border rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                    ann.category === "Emergency" ? "bg-rose-500/10 text-rose-700 border-rose-500/20" :
                    ann.category === "Health" ? "bg-amber-500/10 text-amber-700 border-amber-500/20" :
                    "bg-primary/10 text-primary border-primary/20"
                  }`}>
                    {ann.category}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {ann.published_date ? new Date(ann.published_date).toLocaleDateString() : "Just now"}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-foreground leading-snug">{ann.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{ann.description}</p>
                {ann.image_url && <img src={ann.image_url} alt="" className="mt-3 h-40 w-full rounded-xl object-cover" />}
              </div>
              <div className="border-t pt-4 mt-5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="text-[11px]">Published by: <span className="font-bold text-foreground">{ann.author?.name || "Barangay Official"}</span></span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live on PWA
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl border">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 font-bold text-base text-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                Publish Barangay Announcement
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-accent rounded-full text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Announcement Title</label>
                <input
                  type="text"
                  placeholder="e.g. Free Medical Mission on Saturday"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Post image (optional)</label>
                <label className="flex min-h-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 hover:border-primary/60">
                  {imagePreview ? <img src={imagePreview} alt="Preview" className="h-40 w-full object-cover" /> : <span className="flex items-center gap-2 text-xs text-muted-foreground"><ImagePlus className="h-5 w-5" /> Choose photo</span>}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const file = e.target.files?.[0] || null; setImageFile(file); setImagePreview(file ? URL.createObjectURL(file) : null); }} />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="General">General News</option>
                  <option value="Health">Health & Wellness</option>
                  <option value="Event">Community Event</option>
                  <option value="Emergency">Emergency / Advisory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Description / Content</label>
                <textarea
                  rows={4}
                  placeholder="Provide complete details about the announcement..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-accent text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/95"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
