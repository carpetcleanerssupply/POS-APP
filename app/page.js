import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import { isLowStock } from "@/lib/items";
import { daysOverdue } from "@/lib/dashboard";
import DashboardActivityLog from "./DashboardActivityLog";
import DashboardEmployees from "./DashboardEmployees";
import CreatePOsFromLowStockButton from "./CreatePOsFromLowStockButton";

export const dynamic = "force-dynamic";

function Tile({ label, value, valueColor, sub }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>{label}</div>
      <div className="text-2xl font-semibold mono" style={{ color: valueColor || "var(--deep)" }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: "var(--faint)" }}>{sub}</div>}
    </div>
  );
}

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
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <div className="mb-5">
        <div className="eyebrow mb-1">Overview</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Tile
          label="Overdue Invoices"
          value={overdueCount}
          valueColor={overdueCount > 0 ? "var(--rust)" : "var(--moss)"}
          sub="past due date, unpaid"
        />
        <Tile
          label="Total A/R"
          value={owner ? `$${totalAR.toFixed(2)}` : openInvoices.length}
          valueColor={owner ? (totalAR > 0 ? "var(--rust)" : "var(--moss)") : undefined}
          sub={`${openInvoices.length} open invoice${openInvoices.length === 1 ? "" : "s"}`}
        />
        <Tile
          label="Low Stock"
          value={lowStockItems.length}
          valueColor={lowStockItems.length > 0 ? "var(--rust)" : "var(--moss)"}
          sub={`item${lowStockItems.length === 1 ? "" : "s"} running low`}
        />
        <Tile
          label="Open Purchase Orders"
          value={openPOCount}
          sub={draftInvoiceCount > 0 ? `${draftInvoiceCount} invoice draft${draftInvoiceCount === 1 ? "" : "s"} pending too` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lowStockItems.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="eyebrow">Needs Reordering</div>
              <CreatePOsFromLowStockButton />
            </div>
            <div className="flex flex-col gap-2">
              {lowStockItems.slice(0, 8).map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <span>{i.name} <span className="mono text-xs" style={{ color: "var(--faint)" }}>({i.sku})</span></span>
                  <span className="mono" style={{ color: "var(--rust)" }}>{i.stock} left</span>
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
