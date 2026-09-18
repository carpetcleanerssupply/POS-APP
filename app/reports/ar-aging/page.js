import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import { buildArAging } from "@/lib/reports";

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

  const { rows, grand } = await buildArAging(prisma);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 900 }}>
      <p><Link href="/admin">&larr; Admin</Link></p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>A/R Aging</h1>
        <Link href="/api/reports/ar-aging/export" className="btn btn-sm">Export CSV</Link>
      </div>

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
                <td style={tdLeft}><Link href={`/customers/${r.customerId}/edit`}>{r.customerName}</Link></td>
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
