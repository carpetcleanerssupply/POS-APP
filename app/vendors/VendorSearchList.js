"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export default function VendorSearchList({ vendors, selectedId }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = !q ? vendors : vendors.filter((v) => v.searchText.includes(q));
    return matches.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [vendors, query]);

  return (
    <div className="card flex flex-col" style={{ height: 500 }}>
      <div className="p-3 border-b hairline flex-shrink-0">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vendors…"
          className="w-full px-3 py-2 rounded border text-sm focus-amber hairline"
          style={{ backgroundColor: "var(--panel)" }}
        />
      </div>
      <div className="overflow-y-auto flex-1 min-h-0">
        {filtered.map((v) => (
          <Link
            key={v.id}
            href={`/vendors?selected=${v.id}`}
            className="block w-full text-left px-3 py-2.5 border-b hairline"
            style={{ backgroundColor: selectedId === v.id ? "var(--paper)" : "var(--panel)" }}
          >
            <div className="text-sm font-medium">{v.name || "Unnamed Vendor"}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--faint)" }}>{v.subtitle}</div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-sm text-center" style={{ color: "var(--faint)" }}>No vendors match.</div>
        )}
      </div>
    </div>
  );
}
