"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function VoidPaymentButton({ paymentId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Void this payment? This reverses it and cannot be undone.")) return;
        setBusy(true);
        const res = await fetch(`/api/payments/${paymentId}/void`, { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "Couldn't void this payment.");
          setBusy(false);
          return;
        }
        router.refresh();
      }}
      style={{ color: "#c62828", cursor: "pointer", background: "none", border: "none", padding: 0 }}
    >
      {busy ? "Voiding..." : "Void"}
    </button>
  );
}
