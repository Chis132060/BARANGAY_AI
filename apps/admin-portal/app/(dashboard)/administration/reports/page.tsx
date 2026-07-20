import { BarChart3, Download, FileSpreadsheet } from "lucide-react";

export const metadata = { title: "Barangay Reports | Admin" };

const mockReports = [
  { title: "Monthly Demographics Summary", category: "Demographics", generatedDate: "2026-07-01", format: "PDF / Excel" },
  { title: "Quarterly Financial Collections", category: "Treasury", generatedDate: "2026-07-01", format: "Excel" },
  { title: "Annual Disaster Risk Assessment", category: "Public Safety", generatedDate: "2026-06-15", format: "PDF" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barangay Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate official statutory reports for LGU, DILG, and internal audit.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <FileSpreadsheet className="h-4 w-4" /> Generate New Report
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Report Title</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Generated Date</th>
              <th className="px-6 py-3">Available Formats</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockReports.map((rep) => (
              <tr key={rep.title} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-medium">{rep.title}</td>
                <td className="px-6 py-4 text-muted-foreground">{rep.category}</td>
                <td className="px-6 py-4 font-mono text-xs">{rep.generatedDate}</td>
                <td className="px-6 py-4 font-mono text-xs">{rep.format}</td>
                <td className="px-6 py-4">
                  <button className="flex items-center gap-1 text-primary text-xs font-semibold hover:underline">
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
