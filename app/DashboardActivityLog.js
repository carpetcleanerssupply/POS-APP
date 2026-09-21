"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";

export default function DashboardActivityLog({ entries }) {
  const [show, setShow] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return entries.filter((a) => {
      const d = new Date(a.timestamp);
      if (from && d < new Date(`${from}T00:00:00`)) return false;
      if (to && d > new Date(`${to}T23:59:59`)) return false;
      return true;
    });
  }, [entries, from, to]);

  function exportCsv() {
    if (filtered.length === 0) return;
    const csv = Papa.unparse({
      fields: ["Date/Time", "Action", "User", "Details"],
      data: filtered.map((a) => [new Date(a.timestamp).toLocaleString(), a.action, a.userName || "", a.detailsText || ""]),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between" style={{ marginBottom: show ? 12 : 0 }}>
        <div>
          <div className="eyebrow">Activity Log</div>
          {!show && (
            <div className="text-xs mt-1" style={{ color: "var(--faint)" }}>
              Every action, with who did it and when — pulled up on demand rather than left running for everyone to see.
            </div>
          )}
        </div>
        <button type="button" onClick={() => setShow((s) => !s)} className="btn btn-sm whitespace-nowrap">
          {show ? "Hide" : "View Activity Log"}
        </button>
      </div>

      {show && (
        <>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <label className="text-xs" style={{ color: "var(--faint)" }}>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-2 py-1 rounded border hairline focus-amber text-sm" style={{ backgroundColor: "var(--panel)" }} />
            <label className="text-xs" style={{ color: "var(--faint)" }}>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-2 py-1 rounded border hairline focus-amber text-sm" style={{ backgroundColor: "var(--panel)" }} />
            {(from || to) && (
              <button type="button" onClick={() => { setFrom(""); setTo(""); }} className="text-xs font-medium" style={{ color: "var(--faint)" }}>
                Clear
              </button>
            )}
            {filtered.length > 0 && (
              <button type="button" onClick={exportCsv} className="btn btn-sm ml-auto">
                Export CSV
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-sm" style={{ color: "var(--faint)" }}>Nothing logged in this range.</div>
          ) : (
            <div className="flex flex-col gap-2" style={{ maxHeight: 380, overflow: "auto" }}>
              {filtered.map((a) => (
                <div key={a.id} className="text-sm border-b hairline pb-2 last:border-0">
                  <div className="flex justify-between">
                    <span>{a.action}</span>
                    <span className="text-xs" style={{ color: "var(--faint)" }}>{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--faint)" }}>
                    {a.userName ? `by ${a.userName}` : "user not recorded"}
                    {a.detailsText ? ` — ${a.detailsText}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
