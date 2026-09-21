import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import RecalculateBalancesButton from "./RecalculateBalancesButton";

export default async function AdminPage() {
  const session = await requireSession();
  if (!isOwnerManager(session)) {
    return (
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="text-sm">Admin Tools are only available to Owner/Manager logins.</p>
      </main>
    );
  }

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Home</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Admin</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Admin Tools</h1>
      </div>

      <div className="flex flex-col gap-2 mb-5" style={{ maxWidth: 400 }}>
        <Link href="/reports/sales" className="text-sm font-semibold" style={{ color: "var(--deep)" }}>Sales Report</Link>
        <Link href="/reports/ar-aging" className="text-sm font-semibold" style={{ color: "var(--deep)" }}>A/R Aging</Link>
        <Link href="/reports/inventory-valuation" className="text-sm font-semibold" style={{ color: "var(--deep)" }}>Inventory Valuation</Link>
      </div>

      <div className="card p-5" style={{ maxWidth: 480 }}>
        <div className="eyebrow mb-2">Recalculate Balances</div>
        <p className="text-sm mb-3" style={{ color: "var(--faint)" }}>
          Rebuilds every customer&apos;s balance and every invoice&apos;s paid amount from the full transaction history.
          Use this if something looks off, not as a routine action.
        </p>
        <RecalculateBalancesButton />
      </div>
    </main>
  );
}
