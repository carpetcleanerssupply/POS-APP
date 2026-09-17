import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import { isLowStock } from "@/lib/items";
import { daysOverdue } from "@/lib/dashboard";
import DashboardActivityLog from "./DashboardActivityLog";
import DashboardEmployees from "./DashboardEmployees";

export const dynamic = "force-dynamic";

const tile = { backgroundColor: "#f7f7f7", border: "1px solid #ddd", borderRadius: 8, padding: "1rem" };
const tileLabel = { fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#777", marginBottom: "0.25rem" };
const tileValue = { fontSize: "1.6rem", fontWeight: 700, fontFamily: "monospace" };
const tileSub = { fontSize: "0.75rem", color: "#777", marginTop: "0.25rem" };

export default async function Home() {
  const session = await requireSession();
  const owner = isOwnerManager(session);

  const [accountInvoices, allItems, openPOCount, draftInvoiceCount, users, activityRaw] = await Promise.all([
    prisma.invoice.findMany({ where: { status: "CLOSED", settledTo: "ACCOUNT" } }),
    prisma.item.findMany(),
    prisma.purchaseOrder.count({ where: { status: { in: ["ORDERED", "PARTIAL"] } } }),
    prisma.invoice.count({ where: { status: "DRAFT" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.activityLog.findMany({ orderBy: { timestamp: "desc" }, take: 200, include: { user: true } }),
  ]);

  const openInvoices = accountInvoices.filter((inv) => Number(inv.total) - Number(inv.paidAmount) > 0.005);
  const totalAR = openInvoices.reduce((sum, inv) => sum + (Number(inv.total) - Number(inv.paidAmount)), 0);
  const overdueCount = openInvoices.filter((inv) => inv.dueDate && daysOverdue(inv.dueDate) > 0).length;
  const lowStockItems = allItems.filter(isLowStock);

  const activityEntries = activityRaw.map((a) => ({
    id: a.id,
    timestamp: a.timestamp,
    action: a.action,
    userName: a.user?.name || null,
    detailsText: a.details && typeof a.details === "object" ? Object.entries(a.details).map(([k, v]) => `${k}: ${v}`).join(", ") : null,
  }));

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem 3rem 3rem", maxWidth: 960 }}>
      <h1>Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", margin: "1.5rem 0" }}>
        <div style={tile}>
          <div style={tileLabel}>Overdue Invoices</div>
          <div style={{ ...tileValue, color: overdueCount > 0 ? "#c62828" : "#2e7d32" }}>{overdueCount}</div>
          <div style={tileSub}>past due date, unpaid</div>
        </div>
        <div style={tile}>
          <div style={tileLabel}>Total A/R</div>
          {owner ? (
            <div style={{ ...tileValue, color: totalAR > 0 ? "#c62828" : "#2e7d32" }}>${totalAR.toFixed(2)}</div>
          ) : (
            <div style={tileValue}>{openInvoices.length}</div>
          )}
          <div style={tileSub}>{openInvoices.length} open invoice{openInvoices.length === 1 ? "" : "s"}</div>
        </div>
        <div style={tile}>
          <div style={tileLabel}>Low Stock</div>
          <div style={{ ...tileValue, color: lowStockItems.length > 0 ? "#c62828" : "#2e7d32" }}>{lowStockItems.length}</div>
          <div style={tileSub}>item{lowStockItems.length === 1 ? "" : "s"} running low</div>
        </div>
        <div style={tile}>
          <div style={tileLabel}>Open Purchase Orders</div>
          <div style={tileValue}>{openPOCount}</div>
          {draftInvoiceCount > 0 && (
            <div style={tileSub}>{draftInvoiceCount} invoice draft{draftInvoiceCount === 1 ? "" : "s"} pending too</div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
        {lowStockItems.length > 0 && (
          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>Needs Reordering</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {lowStockItems.slice(0, 8).map((i) => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span>{i.name} <span style={{ color: "#777", fontSize: "0.8rem" }}>({i.sku})</span></span>
                  <span style={{ color: "#c62828" }}>{i.stock} left</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DashboardActivityLog entries={JSON.parse(JSON.stringify(activityEntries))} />

        <DashboardEmployees
          users={users.map((u) => ({ id: u.id, name: u.name, tier: u.tier, active: u.active }))}
          canManage={owner}
          currentUserId={session.user.id}
        />
      </div>
    </main>
  );
}
