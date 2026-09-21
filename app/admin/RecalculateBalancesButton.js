"use client";

import { useState } from "react";

export default function RecalculateBalancesButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function run() {
    if (!confirm("Recalculate every customer's balance from full transaction history? This can't be undone.")) return;
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/admin/recalculate-balances", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setResult({ error: data.error || "Something went wrong." });
    } else {
      setResult({ ok: true, customerCount: data.customerCount });
    }
    setBusy(false);
  }

  return (
    <div>
      <button type="button" disabled={busy} onClick={run} className="btn btn-primary">
        {busy ? "Recalculating..." : "Recalculate Balances"}
      </button>
      {result?.error && <p className="text-sm mt-2" style={{ color: "var(--rust)" }}>{result.error}</p>}
      {result?.ok && <p className="text-sm mt-2" style={{ color: "var(--moss)" }}>Done — {result.customerCount} customer(s) reconciled.</p>}
    </div>
  );
}
