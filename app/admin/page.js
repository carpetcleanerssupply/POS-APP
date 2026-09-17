import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import RecalculateBalancesButton from "./RecalculateBalancesButton";

export default async function AdminPage() {
  const session = await requireSession();
  if (!isOwnerManager(session)) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <p>Admin Tools are only available to Owner/Manager logins.</p>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 600 }}>
      <p><a href="/">&larr; Home</a></p>
      <h1>Admin Tools</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: "1.5rem 0" }}>
        <a href="/reports/ar-aging">A/R Aging</a>
        <a href="/reports/inventory-valuation">Inventory Valuation</a>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>Recalculate Balances</h3>
        <p style={{ color: "#777", fontSize: "0.9rem" }}>
          Rebuilds every customer's balance and every invoice's paid amount from the full transaction history.
          Use this if something looks off, not as a routine action.
        </p>
        <RecalculateBalancesButton />
      </div>
    </main>
  );
}
