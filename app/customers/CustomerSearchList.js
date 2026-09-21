"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export default function CustomerSearchList({ customers, selectedId }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = !q ? customers : customers.filter((c) => c.searchText.includes(q));
    return matches.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, query]);

  return (
    <div className="card flex flex-col" style={{ height: 500 }}>
      <div className="p-3 border-b hairline flex-shrink-0">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers…"
          className="w-full px-3 py-2 rounded border text-sm focus-amber hairline"
          style={{ backgroundColor: "var(--panel)" }}
        />
      </div>
      <div className="overflow-y-auto flex-1 min-h-0">
        {filtered.map((c) => (
          <Link
            key={c.id}
            href={`/customers?selected=${c.id}`}
            className="block w-full text-left px-3 py-2.5 border-b hairline"
            style={{ backgroundColor: selectedId === c.id ? "var(--paper)" : "var(--panel)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">{c.name}</div>
              {c.balance > 0.005 && (
                <span className="mono text-xs whitespace-nowrap" style={{ color: "var(--rust)" }}>
                  ${c.balance.toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--faint)" }}>{c.subtitle}</div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-sm text-center" style={{ color: "var(--faint)" }}>No customers match.</div>
        )}
      </div>
    </div>
  );
}
