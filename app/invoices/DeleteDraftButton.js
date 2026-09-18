"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteDraftButton({ invoiceId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Delete this draft invoice? This can't be undone.")) return;
        setBusy(true);
        const res = await fetch(`/api/invoices/${invoiceId}/delete`, { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "Couldn't delete this draft.");
          setBusy(false);
          return;
        }
        router.push("/invoices");
      }}
      className="btn btn-sm btn-danger"
    >
      {busy ? "Deleting..." : "Delete Draft"}
    </button>
  );
}
