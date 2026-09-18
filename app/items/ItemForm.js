"use client";

import Link from "next/link";
import { useState } from "react";

const ERROR_MESSAGES = {
  required: "SKU and Item Name are required.",
  duplicate_sku: "That SKU is already in use — SKUs must be unique.",
};

const fieldStyle = { display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" };
const rowStyle = { display: "flex", gap: "1rem" };
const labelStyle = { flex: 1, fontSize: "0.9rem" };

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
    <div style={{ maxWidth: 560 }}>
      {error && ERROR_MESSAGES[error] && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>
          {ERROR_MESSAGES[error]}
        </p>
      )}

      <form action={action} method="POST" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <div style={rowStyle}>
          <label style={labelStyle}>
            SKU *
            <input name="sku" defaultValue={v("sku")} required style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Item Name *
            <input name="name" defaultValue={v("name")} required style={fieldStyle} />
          </label>
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>
            Category
            <input name="category" defaultValue={v("category")} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Vendor
            <input name="vendorName" defaultValue={v("vendorName")} style={fieldStyle} />
          </label>
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>
            Cost
            <input name="cost" type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Price
            <input name="price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} style={fieldStyle} />
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.4rem" }}>
              <input
                type="number"
                placeholder="%"
                value={priceBumpPct}
                onChange={(e) => setPriceBumpPct(e.target.value)}
                style={{ width: 60, padding: "0.3rem", fontSize: "0.8rem" }}
              />
              <button
                type="button"
                onClick={bumpPrice}
                style={{ fontSize: "0.75rem", padding: "0.3rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Increase price by %
              </button>
            </div>
          </label>
        </div>

        {showMargin && (
          <div style={{ fontSize: "0.85rem", color: profit >= 0 ? "#2e7d32" : "#c62828" }}>
            Profit: {currency(profit)}
            {margin != null && <span style={{ color: "#777" }}> ({margin.toFixed(1)}% margin)</span>}
          </div>
        )}

        <div style={rowStyle}>
          <label style={labelStyle}>
            Stock on Hand
            <input name="stock" type="number" step="1" min="0" defaultValue={v("stock", 0)} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Low Stock Alert Below
            <input
              name="lowStockThreshold"
              type="number"
              step="1"
              min="0"
              placeholder="default (5, or 8 for chemicals sold by the gallon)"
              defaultValue={item?.lowStockThreshold ?? ""}
              style={fieldStyle}
            />
          </label>
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>
            Unit
            <input name="unit" defaultValue={v("unit")} placeholder="ea" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Units / Case
            <input name="caseQty" type="number" step="1" min="1" defaultValue={v("caseQty", 1)} style={fieldStyle} />
          </label>
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>
            COGS Account
            <input name="cogsAccount" defaultValue={v("cogsAccount", "Cost of Goods Sold")} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Income Account
            <input name="incomeAccount" defaultValue={v("incomeAccount", "Uncategorized")} style={fieldStyle} />
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button type="submit" className="btn btn-primary">
            {submitLabel}
          </button>
          <Link href="/items" className="btn">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
