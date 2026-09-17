import Papa from "papaparse";

export const ITEM_CSV_FIELDS = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "Item Name" },
  { key: "category", label: "Category" },
  { key: "vendorName", label: "Vendor" },
  { key: "cost", label: "Cost", numeric: true },
  { key: "price", label: "Price", numeric: true },
  { key: "stock", label: "Stock Qty", numeric: true },
  { key: "unit", label: "Unit" },
  { key: "caseQty", label: "Units/Case", numeric: true },
  { key: "cogsAccount", label: "COGS Acct" },
  { key: "incomeAccount", label: "Income Account" },
];

export function itemsToCsv(items) {
  const fields = ITEM_CSV_FIELDS.map((f) => f.label);
  const data = items.map((item) => ITEM_CSV_FIELDS.map((f) => item[f.key] ?? ""));
  return Papa.unparse({ fields, data });
}

// Expects the exact header row itemsToCsv produces — a deliberately simple
// round-trip format rather than the prototype's fuzzy column-mapping wizard.
export function parseItemsCsv(text) {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (result.errors.length > 0) {
    throw new Error(`Couldn't parse that CSV: ${result.errors[0].message}`);
  }

  const headers = result.meta.fields || [];
  const labelToKey = Object.fromEntries(ITEM_CSV_FIELDS.map((f) => [f.label, f.key]));
  const missing = ["SKU", "Item Name"].filter((label) => !headers.includes(label));
  if (missing.length > 0) {
    throw new Error(`Missing required column(s): ${missing.join(", ")}. Expected headers: ${ITEM_CSV_FIELDS.map((f) => f.label).join(", ")}`);
  }

  return result.data.map((row) => {
    const out = {};
    for (const [label, key] of Object.entries(labelToKey)) {
      const raw = row[label];
      const field = ITEM_CSV_FIELDS.find((f) => f.key === key);
      out[key] = field.numeric ? Number(String(raw ?? "0").replace(/[^0-9.-]/g, "")) || 0 : (raw ?? "").trim();
    }
    return out;
  });
}

export const VENDOR_CSV_FIELDS = [
  { key: "name", label: "Vendor Name" },
  { key: "contactName", label: "Contact Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "email2", label: "Email 2" },
  { key: "addressStreet", label: "Street" },
  { key: "addressStreet2", label: "Street 2" },
  { key: "addressCity", label: "City" },
  { key: "addressState", label: "State" },
  { key: "addressZip", label: "Zip" },
  { key: "notes", label: "Notes" },
];

export function vendorsToCsv(vendors) {
  const fields = VENDOR_CSV_FIELDS.map((f) => f.label);
  const data = vendors.map((v) => VENDOR_CSV_FIELDS.map((f) => v[f.key] ?? ""));
  return Papa.unparse({ fields, data });
}

export function parseVendorsCsv(text) {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (result.errors.length > 0) {
    throw new Error(`Couldn't parse that CSV: ${result.errors[0].message}`);
  }

  const headers = result.meta.fields || [];
  const labelToKey = Object.fromEntries(VENDOR_CSV_FIELDS.map((f) => [f.label, f.key]));
  if (!headers.includes("Vendor Name")) {
    throw new Error(`Missing required column: Vendor Name. Expected headers: ${VENDOR_CSV_FIELDS.map((f) => f.label).join(", ")}`);
  }

  return result.data.map((row) => {
    const out = {};
    for (const [label, key] of Object.entries(labelToKey)) {
      out[key] = (row[label] ?? "").trim();
    }
    return out;
  });
}
