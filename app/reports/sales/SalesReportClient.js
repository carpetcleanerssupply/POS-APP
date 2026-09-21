"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";

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
    return <p className="text-sm" style={{ color: "var(--faint)" }}>No closed invoices yet — sales will show up here once some are on the books.</p>;
  }

  const th = "px-3 py-2 text-left font-medium text-xs uppercase tracking-wide";

  return (
    <div>
      <p className="no-print mb-4">
        <button type="button" onClick={exportCsv} className="btn btn-sm">Export CSV</button>
      </p>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow">Revenue by Month (last 12)</div>
            {selectedMonth && (
              <button type="button" onClick={() => setSelectedMonth(null)} className="btn btn-sm">
                Show all time →
              </button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--paper)" }}>
                <th className={th} style={{ color: "var(--faint)" }}>Month</th>
                <th className={th} style={{ color: "var(--faint)" }}>Invoices</th>
                <th className={`${th} text-right`} style={{ color: "var(--faint)" }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {byMonth.map((m) => (
                <tr
                  key={m.key}
                  onClick={() => setSelectedMonth(selectedMonth === m.key ? null : m.key)}
                  style={{ cursor: "pointer", backgroundColor: selectedMonth === m.key ? "var(--paper)" : "transparent" }}
                >
                  <td className="px-3 py-2 border-t hairline">{m.label}</td>
                  <td className="px-3 py-2 border-t hairline">{m.count}</td>
                  <td className="px-3 py-2 border-t hairline text-right mono">{currency(m.revenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-3 py-2 font-semibold" style={{ borderTop: "2px solid var(--deep)" }}>Total (12 mo.)</td>
                <td className="px-3 py-2" style={{ borderTop: "2px solid var(--deep)" }}></td>
                <td className="px-3 py-2 text-right font-semibold mono" style={{ borderTop: "2px solid var(--deep)" }}>
                  {currency(totalRevenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card p-4">
            <div className="eyebrow mb-3">By Category — {selectedLabel}</div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "var(--paper)" }}>
                  <th className={th} style={{ color: "var(--faint)" }}>Category</th>
                  <th className={th} style={{ color: "var(--faint)" }}>Qty</th>
                  <th className={`${th} text-right`} style={{ color: "var(--faint)" }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map((c) => (
                  <tr key={c.category}>
                    <td className="px-3 py-2 border-t hairline">{c.category}</td>
                    <td className="px-3 py-2 border-t hairline">{c.qty}</td>
                    <td className="px-3 py-2 border-t hairline text-right mono">{currency(c.revenue)}</td>
                  </tr>
                ))}
                {categoryBreakdown.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-sm border-t hairline" colSpan={3} style={{ color: "var(--faint)" }}>Nothing sold in this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card p-4">
            <div className="eyebrow mb-3">Top Items — {selectedLabel}</div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "var(--paper)" }}>
                  <th className={th} style={{ color: "var(--faint)" }}>Item</th>
                  <th className={th} style={{ color: "var(--faint)" }}>Qty</th>
                  <th className={`${th} text-right`} style={{ color: "var(--faint)" }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((it, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 border-t hairline">
                      {it.name} <span className="text-xs" style={{ color: "var(--faint)" }}>({it.sku})</span>
                    </td>
                    <td className="px-3 py-2 border-t hairline">{it.qty}</td>
                    <td className="px-3 py-2 border-t hairline text-right mono">{currency(it.revenue)}</td>
                  </tr>
                ))}
                {topItems.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-sm border-t hairline" colSpan={3} style={{ color: "var(--faint)" }}>Nothing sold in this period.</td>
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
