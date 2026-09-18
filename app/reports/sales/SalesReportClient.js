"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";

const th = { textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };
const td = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #eee" };

function currency(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function SalesReportClient({ invoiceSummaries, lineRows }) {
  const [selectedMonth, setSelectedMonth] = useState(null);

  const byMonth = useMemo(() => {
    const map = {};
    invoiceSummaries.forEach((inv) => {
      const key = monthKey(inv.date);
      if (!map[key]) map[key] = { key, label: monthLabel(inv.date), revenue: 0, count: 0 };
      map[key].revenue += inv.total;
      map[key].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => (a.key < b.key ? 1 : -1))
      .slice(0, 12);
  }, [invoiceSummaries]);

  const relevantLines = useMemo(() => {
    if (!selectedMonth) return lineRows;
    return lineRows.filter((l) => monthKey(l.date) === selectedMonth);
  }, [lineRows, selectedMonth]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    relevantLines.forEach((l) => {
      if (!map[l.category]) map[l.category] = { category: l.category, revenue: 0, qty: 0 };
      map[l.category].revenue += l.ext;
      map[l.category].qty += l.qty;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [relevantLines]);

  const topItems = useMemo(() => {
    const map = {};
    relevantLines.forEach((l) => {
      const key = l.itemId || l.sku;
      if (!map[key]) map[key] = { name: l.name, sku: l.sku, revenue: 0, qty: 0 };
      map[key].revenue += l.ext;
      map[key].qty += l.qty;
    });
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [relevantLines]);

  const totalRevenue = byMonth.reduce((sum, m) => sum + m.revenue, 0);
  const selectedLabel = selectedMonth ? byMonth.find((m) => m.key === selectedMonth)?.label : "All Time";

  function exportCsv() {
    if (byMonth.length === 0) return;
    const csv = Papa.unparse({
      fields: ["Month", "Invoices", "Revenue"],
      data: byMonth
        .slice()
        .reverse()
        .map((m) => [m.label, m.count, m.revenue.toFixed(2)]),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (byMonth.length === 0) {
    return <p style={{ color: "#777" }}>No closed invoices yet — sales will show up here once some are on the books.</p>;
  }

  return (
    <div>
      <p className="no-print">
        <button type="button" className="btn btn-sm" onClick={exportCsv}>Export CSV</button>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
            <h3 style={{ margin: 0 }}>Revenue by Month (last 12)</h3>
            {selectedMonth && (
              <button type="button" className="btn btn-sm" onClick={() => setSelectedMonth(null)}>
                Show all time →
              </button>
            )}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Month</th>
                <th style={th}>Invoices</th>
                <th style={{ ...th, textAlign: "right" }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {byMonth.map((m) => (
                <tr
                  key={m.key}
                  onClick={() => setSelectedMonth(selectedMonth === m.key ? null : m.key)}
                  style={{ cursor: "pointer", background: selectedMonth === m.key ? "#f7f2e8" : "transparent" }}
                >
                  <td style={td}>{m.label}</td>
                  <td style={td}>{m.count}</td>
                  <td style={{ ...td, textAlign: "right" }}>{currency(m.revenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...td, fontWeight: 700, borderTop: "2px solid #1e3a5f", borderBottom: "none" }}>Total (12 mo.)</td>
                <td style={{ ...td, borderTop: "2px solid #1e3a5f", borderBottom: "none" }}></td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700, borderTop: "2px solid #1e3a5f", borderBottom: "none" }}>
                  {currency(totalRevenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>By Category — {selectedLabel}</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Category</th>
                  <th style={th}>Qty</th>
                  <th style={{ ...th, textAlign: "right" }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map((c) => (
                  <tr key={c.category}>
                    <td style={td}>{c.category}</td>
                    <td style={td}>{c.qty}</td>
                    <td style={{ ...td, textAlign: "right" }}>{currency(c.revenue)}</td>
                  </tr>
                ))}
                {categoryBreakdown.length === 0 && (
                  <tr>
                    <td style={td} colSpan={3}>Nothing sold in this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>Top Items — {selectedLabel}</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Item</th>
                  <th style={th}>Qty</th>
                  <th style={{ ...th, textAlign: "right" }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((it, i) => (
                  <tr key={i}>
                    <td style={td}>
                      {it.name} <span style={{ color: "#777", fontSize: "0.8rem" }}>({it.sku})</span>
                    </td>
                    <td style={td}>{it.qty}</td>
                    <td style={{ ...td, textAlign: "right" }}>{currency(it.revenue)}</td>
                  </tr>
                ))}
                {topItems.length === 0 && (
                  <tr>
                    <td style={td} colSpan={3}>Nothing sold in this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
