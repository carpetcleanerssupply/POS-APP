import Link from "next/link";

const ERROR_MESSAGES = {
  required: "SKU and Item Name are required.",
  duplicate_sku: "That SKU is already in use — SKUs must be unique.",
};

const fieldStyle = { display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" };
const rowStyle = { display: "flex", gap: "1rem" };
const labelStyle = { flex: 1, fontSize: "0.9rem" };

export default function ItemForm({ action, item, error, submitLabel }) {
  const v = (key, fallback = "") => item?.[key] ?? fallback;

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
            <input name="cost" type="number" step="0.01" min="0" defaultValue={v("cost", 0)} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Price
            <input name="price" type="number" step="0.01" min="0" defaultValue={v("price", 0)} style={fieldStyle} />
          </label>
        </div>

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
          <button type="submit" style={{ padding: "0.6rem 1.2rem", cursor: "pointer" }}>
            {submitLabel}
          </button>
          <Link href="/items" style={{ padding: "0.6rem 1.2rem", alignSelf: "center" }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
