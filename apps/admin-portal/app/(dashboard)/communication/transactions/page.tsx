import { CreditCard, Download } from "lucide-react";

export const metadata = { title: "Transaction History | Admin" };

const mockTransactions = [
  { orNo: "OR-2026-8891", resident: "Juan Dela Cruz", item: "Barangay Clearance Fee", amount: "₱50.00", date: "2026-07-20 10:15", status: "Paid" },
  { orNo: "OR-2026-8892", resident: "Aling Nena Store", item: "Business Permit Fee", amount: "₱500.00", date: "2026-07-20 11:30", status: "Paid" },
];

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-sm text-muted-foreground mt-1">Official Receipts (OR) and payment collection log.</p>
        </div>
        <button className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent">
          <Download className="h-4 w-4" /> Export Report
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">OR Number</th>
              <th className="px-6 py-3">Payer / Resident</th>
              <th className="px-6 py-3">Particulars</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Payment Date</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockTransactions.map((tx) => (
              <tr key={tx.orNo} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{tx.orNo}</td>
                <td className="px-6 py-4 font-medium">{tx.resident}</td>
                <td className="px-6 py-4 text-muted-foreground">{tx.item}</td>
                <td className="px-6 py-4 font-bold text-foreground">{tx.amount}</td>
                <td className="px-6 py-4 font-mono text-xs">{tx.date}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
