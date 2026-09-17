import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import { daysOverdue } from "@/lib/dashboard";

const th = { textAlign: "right", padding: "0.5rem 0.75rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };
const thLeft = { ...th, textAlign: "left" };
const td = { textAlign: "right", padding: "0.5rem 0.75rem", borderBottom: "1px solid #eee" };
const tdLeft = { ...td, textAlign: "left" };

export const dynamic = "force-dynamic";

export default async function ARAgingPage() {
  const session = await requireSession();
  if (!isOwnerManager(session)) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <p>A/R Aging is only available to Owner/Manager logins.</p>
      </main>
    );
  }

  const accountInvoices = await prisma.invoice.findMany({ where: { status: "CLOSED", settledTo: "ACCOUNT" } });
  const openInvoices = accountInvoices.filter((inv) => Number(inv.total) - Number(inv.paidAmount) > 0.005);

  const byCustomer = {};
  for (const inv of openInvoices) {
    const owed = Number(inv.total) - Number(inv.paidAmount);
    const days = daysOverdue(inv.dueDate);
    const bucket = days <= 0 ? "current" : days <= 30 ? "d30" : days <= 60 ? "d60" : days <= 90 ? "d90" : "d90plus";
    if (!byCustomer[inv.customerId]) {
      byCustomer[inv.customerId] = { customerId: inv.customerId, customerName: inv.customerName, current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0, total: 0 };
    }
    byCustomer[inv.customerId][bucket] += owed;
    byCustomer[inv.customerId].total += owed;
  }
  const rows = Object.values(byCustomer).sort((a, b) => b.total - a.total);
  const grand = rows.reduce(
    (acc, r) => ({
      current: acc.current + r.current,
      d30: acc.d30 + r.d30,
      d60: acc.d60 + r.d60,
      d90: acc.d90 + r.d90,
      d90plus: acc.d90plus + r.d90plus,
      total: acc.total + r.total,
    }),
    { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0, total: 0 }
  );

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 900 }}>
      <p><a href="/admin">&larr; Admin</a></p>
      <h1>A/R Aging</h1>

      {rows.length === 0 ? (
        <p style={{ color: "#777" }}>Nothing outstanding — every account invoice is either paid off or not yet due.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thLeft}>Customer</th>
              <th style={th}>Current</th>
              <th style={th}>1–30</th>
              <th style={th}>31–60</th>
              <th style={th}>61–90</th>
              <th style={th}>90+</th>
              <th style={th}>Total Due</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.customerId}>
                <td style={tdLeft}><a href={`/customers/${r.customerId}/edit`}>{r.customerName}</a></td>
                <td style={td}>${r.current.toFixed(2)}</td>
                <td style={td}>${r.d30.toFixed(2)}</td>
                <td style={td}>${r.d60.toFixed(2)}</td>
                <td style={td}>${r.d90.toFixed(2)}</td>
                <td style={td}>${r.d90plus.toFixed(2)}</td>
                <td style={{ ...td, fontWeight: 700 }}>${r.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...tdLeft, fontWeight: 700 }}>Total</td>
              <td style={{ ...td, fontWeight: 700 }}>${grand.current.toFixed(2)}</td>
              <td style={{ ...td, fontWeight: 700 }}>${grand.d30.toFixed(2)}</td>
              <td style={{ ...td, fontWeight: 700 }}>${grand.d60.toFixed(2)}</td>
              <td style={{ ...td, fontWeight: 700 }}>${grand.d90.toFixed(2)}</td>
              <td style={{ ...td, fontWeight: 700 }}>${grand.d90plus.toFixed(2)}</td>
              <td style={{ ...td, fontWeight: 700 }}>${grand.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </main>
  );
}
