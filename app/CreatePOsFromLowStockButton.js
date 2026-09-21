"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreatePOsFromLowStockButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [skipped, setSkipped] = useState(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    setSkipped(null);
    const res = await fetch("/api/purchase-orders/create-from-low-stock", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      setBusy(false);
      return;
    }
    if (data.skippedVendorNames?.length > 0) {
      setSkipped({ createdCount: data.createdCount, vendorNames: data.skippedVendorNames });
      setBusy(false);
      return;
    }
    router.push("/purchase-orders");
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={busy} className="text-xs font-semibold" style={{ color: "var(--deep)", cursor: "pointer" }}>
        {busy ? "Creating..." : "Create PO(s) →"}
      </button>
      {error && <p className="text-xs mt-1" style={{ color: "var(--rust)" }}>{error}</p>}
      {skipped && (
        <p className="text-xs mt-1" style={{ color: "var(--rust)" }}>
          Created {skipped.createdCount} PO(s). Skipped items with no matching vendor record on file:{" "}
          {skipped.vendorNames.join(", ")}. <Link href="/purchase-orders" className="underline">View Purchase Orders</Link>
        </p>
      )}
    </div>
  );
}
