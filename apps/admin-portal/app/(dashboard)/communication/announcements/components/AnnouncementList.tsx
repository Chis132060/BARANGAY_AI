"use client";

import { AnnouncementItem } from "../../actions";

interface AnnouncementListProps {
  announcements: AnnouncementItem[];
}

export function AnnouncementList({ announcements }: AnnouncementListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {announcements.length === 0 ? (
        <div className="col-span-full border border-dashed rounded-xl p-10 text-center bg-card shadow-sm text-muted-foreground font-medium">
          No announcements published yet.
        </div>
      ) : (
        announcements.map((ann) => (
          <div key={ann.id} className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {ann.category}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {ann.published_date ? new Date(ann.published_date).toLocaleDateString() : "—"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground line-clamp-1">{ann.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{ann.description}</p>
            </div>
            <div className="border-t pt-4 mt-5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Author: <span className="font-semibold">{ann.author ? ann.author.name : "Staff"}</span></span>
              <span className="font-semibold text-emerald-600">{ann.status}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
