import { FileText, Plus, Download } from "lucide-react";

export const metadata = { title: "Certificates Issuance | Admin" };

const mockCertificates = [
  { certNo: "CERT-2026-001", type: "Barangay Clearance", recipient: "Juan Dela Cruz", issuedBy: "Sec. Ana Santos", date: "2026-07-18" },
  { certNo: "CERT-2026-002", type: "Certificate of Indigency", recipient: "Maria Santos", issuedBy: "Sec. Ana Santos", date: "2026-07-19" },
  { certNo: "CERT-2026-003", type: "Certificate of Residency", recipient: "Antonio Luna", issuedBy: "Sec. Ana Santos", date: "2026-07-20" },
];

export default function CertificatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificates Issuance</h1>
          <p className="text-sm text-muted-foreground mt-1">Official Barangay certificates issued and pending issuance.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <Plus className="h-4 w-4" /> Issue New Certificate
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Certificate No.</th>
              <th className="px-6 py-3">Document Type</th>
              <th className="px-6 py-3">Recipient</th>
              <th className="px-6 py-3">Issuing Officer</th>
              <th className="px-6 py-3">Date Issued</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockCertificates.map((cert) => (
              <tr key={cert.certNo} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{cert.certNo}</td>
                <td className="px-6 py-4 font-medium">{cert.type}</td>
                <td className="px-6 py-4 text-muted-foreground">{cert.recipient}</td>
                <td className="px-6 py-4">{cert.issuedBy}</td>
                <td className="px-6 py-4 font-mono text-xs">{cert.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
