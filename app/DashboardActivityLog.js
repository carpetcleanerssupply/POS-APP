"use client";

import { useMemo, useState } from "react";

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

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ marginTop: 0 }}>Activity Log</h3>
        <button type="button" onClick={() => setShow((s) => !s)} style={{ cursor: "pointer" }}>
          {show ? "Hide" : "View Activity Log"}
        </button>
      </div>

      {show && (
        <>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <label style={{ fontSize: "0.85rem" }}>
              From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: "0.3rem" }} />
            </label>
            <label style={{ fontSize: "0.85rem" }}>
              To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: "0.3rem" }} />
            </label>
            {(from || to) && (
              <button type="button" onClick={() => { setFrom(""); setTo(""); }} style={{ cursor: "pointer", fontSize: "0.85rem" }}>
                Clear
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <p style={{ color: "#777", fontSize: "0.9rem" }}>Nothing logged in this range.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 380, overflow: "auto" }}>
              {filtered.map((a) => (
                <div key={a.id} style={{ fontSize: "0.85rem", borderBottom: "1px solid #eee", paddingBottom: "0.4rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{a.action}</span>
                    <span style={{ color: "#777" }}>{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ color: "#777" }}>
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
