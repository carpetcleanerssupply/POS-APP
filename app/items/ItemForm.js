"use client";

import Link from "next/link";
import { useState } from "react";

const ERROR_MESSAGES = {
  required: "SKU and Item Name are required.",
  duplicate_sku: "That SKU is already in use — SKUs must be unique.",
};

const inputClass = "w-full px-3 py-2 rounded border text-sm focus-amber hairline";
const inputStyle = { backgroundColor: "var(--panel)" };

function currency(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export default function ItemForm({ action, item, error, submitLabel, showMargin }) {
  const v = (key, fallback = "") => item?.[key] ?? fallback;

  const [cost, setCost] = useState(v("cost", 0));
  const [price, setPrice] = useState(v("price", 0));
  const [priceBumpPct, setPriceBumpPct] = useState("");

  const profit = (Number(price) || 0) - (Number(cost) || 0);
  const margin = Number(price) > 0 ? (profit / Number(price)) * 100 : null;

  function bumpPrice() {
    const pct = Number(priceBumpPct);
    if (!pct) return;
    const cur = Number(price) || 0;
    setPrice(Math.round(cur * (1 + pct / 100) * 100) / 100);
    setPriceBumpPct("");
  }

  return (
    <div className="card p-5" style={{ maxWidth: 640 }}>
      {error && ERROR_MESSAGES[error] && (
        <p className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>
          {ERROR_MESSAGES[error]}
        </p>
      )}

      <form action={action} method="POST" className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>SKU *</div>
            <input name="sku" defaultValue={v("sku")} required className={inputClass} style={inputStyle} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Item Name *</div>
            <input name="name" defaultValue={v("name")} required className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Category</div>
            <input name="category" defaultValue={v("category")} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Vendor</div>
            <input name="vendorName" defaultValue={v("vendorName")} className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Cost</div>
            <input name="cost" type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Price</div>
            <input name="price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} style={inputStyle} />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                placeholder="%"
                value={priceBumpPct}
                onChange={(e) => setPriceBumpPct(e.target.value)}
                className="rounded border hairline focus-amber text-xs"
                style={{ ...inputStyle, width: 60, padding: "0.3rem" }}
              />
              <button
                type="button"
                onClick={bumpPrice}
                className="text-xs font-semibold whitespace-nowrap"
                style={{ color: "var(--deep)", cursor: "pointer" }}
              >
                Increase price by %
              </button>
            </div>
          </div>
        </div>

        {showMargin && (
          <div className="text-sm" style={{ color: profit >= 0 ? "var(--moss)" : "var(--rust)" }}>
            Profit: {currency(profit)}
            {margin != null && <span style={{ color: "var(--faint)" }}> ({margin.toFixed(1)}% margin)</span>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Stock on Hand</div>
            <input name="stock" type="number" step="1" min="0" defaultValue={v("stock", 0)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Low Stock Alert Below</div>
            <input
              name="lowStockThreshold"
              type="number"
              step="1"
              min="0"
              placeholder="default (5, or 8 for chemicals sold by the gallon)"
              defaultValue={item?.lowStockThreshold ?? ""}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Unit</div>
            <input name="unit" defaultValue={v("unit")} placeholder="ea" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Units / Case</div>
            <input name="caseQty" type="number" step="1" min="1" defaultValue={v("caseQty", 1)} className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>COGS Account</div>
            <input name="cogsAccount" defaultValue={v("cogsAccount", "Cost of Goods Sold")} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Income Account</div>
            <input name="incomeAccount" defaultValue={v("incomeAccount", "Uncategorized")} className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn btn-primary">{submitLabel}</button>
          <Link href="/items" className="btn">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
