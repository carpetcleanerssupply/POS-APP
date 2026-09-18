import Papa from "papaparse";
import { displayName } from "@/lib/customers";

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

export const PAYMENT_CSV_FIELDS = [
  { key: "date", label: "Date", date: true },
  { key: "customerName", label: "Customer" },
  { key: "method", label: "Method" },
  { key: "checkNumber", label: "Check #" },
  { key: "appliedTo", label: "Applied To" },
  { key: "amount", label: "Amount", numeric: true },
  { key: "unapplied", label: "Unapplied", numeric: true },
  { key: "atSale", label: "At Sale", boolean: true },
  { key: "recordedByName", label: "Recorded By" },
  { key: "voided", label: "Voided", boolean: true },
];

export function paymentsToCsv(payments) {
  const fields = PAYMENT_CSV_FIELDS.map((f) => f.label);
  const data = payments.map((p) =>
    PAYMENT_CSV_FIELDS.map((f) => {
      const v = p[f.key];
      if (f.date) return new Date(v).toLocaleDateString();
      if (f.boolean) return v ? "Yes" : "No";
      return v ?? "";
    })
  );
  return Papa.unparse({ fields, data });
}

export const RETURN_CSV_FIELDS = [
  { key: "number", label: "Return #", numeric: true },
  { key: "date", label: "Date", date: true },
  { key: "customerName", label: "Customer" },
  { key: "originalInvoiceNumber", label: "Against Invoice #", numeric: true },
  { key: "refundMethod", label: "Refund Method" },
  { key: "checkNumber", label: "Check #" },
  { key: "total", label: "Total", numeric: true },
  { key: "processedByName", label: "Processed By" },
  { key: "voided", label: "Voided", boolean: true },
];

export function returnsToCsv(returns) {
  const fields = RETURN_CSV_FIELDS.map((f) => f.label);
  const data = returns.map((r) =>
    RETURN_CSV_FIELDS.map((f) => {
      const v = r[f.key];
      if (f.date) return new Date(v).toLocaleDateString();
      if (f.boolean) return v ? "Yes" : "No";
      return v ?? "";
    })
  );
  return Papa.unparse({ fields, data });
}

// Balance is exported for reference but deliberately not accepted on
// import — a customer's balance only ever comes from real transaction
// history (invoices/payments/returns), never a direct overwrite, matching
// the same principle Recalculate Balances is built on.
export const CUSTOMER_CSV_FIELDS = [
  { key: "company", label: "Company" },
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "workPhone", label: "Work Phone" },
  { key: "cellPhone", label: "Cell Phone" },
  { key: "email", label: "Email" },
  { key: "email2", label: "Secondary Email" },
  { key: "unsubscribed", label: "Unsubscribed", boolean: true },
  { key: "webCustomer", label: "Web Customer", boolean: true },
  { key: "billingStreet", label: "Billing Street" },
  { key: "billingStreet2", label: "Billing Street 2" },
  { key: "billingCity", label: "Billing City" },
  { key: "billingState", label: "Billing State" },
  { key: "billingZip", label: "Billing ZIP" },
  { key: "shipSameAsBilling", label: "Ship Same As Billing", boolean: true },
  { key: "shippingStreet", label: "Shipping Street" },
  { key: "shippingStreet2", label: "Shipping Street 2" },
  { key: "shippingCity", label: "Shipping City" },
  { key: "shippingState", label: "Shipping State" },
  { key: "shippingZip", label: "Shipping ZIP" },
  { key: "taxExempt", label: "Tax-Exempt", boolean: true },
  { key: "resaleCert", label: "Resale Cert #" },
  { key: "balance", label: "Balance (reference only, not imported)", numeric: true },
];

export function customersToCsv(customers) {
  const fields = CUSTOMER_CSV_FIELDS.map((f) => f.label);
  const data = customers.map((c) =>
    CUSTOMER_CSV_FIELDS.map((f) => {
      const v = c[f.key];
      if (f.boolean) return v ? "Yes" : "No";
      return v ?? "";
    })
  );
  return Papa.unparse({ fields, data });
}

// A simple, minimal list for occasional email blasts — just names and
// addresses, nobody who's opted out, and nobody with no email on file at
// all (they'd just be a blank row in the mailing tool anyway).
export function mailingListToCsv(customers) {
  const eligible = customers.filter((c) => !c.unsubscribed && ((c.email || "").trim() || (c.email2 || "").trim()));
  return Papa.unparse({
    fields: ["Name", "Email", "Secondary Email"],
    data: eligible.map((c) => [displayName(c), c.email || "", c.email2 || ""]),
  });
}

// Create-only: unlike Items (SKU) and Vendors (name), Customer has no
// reliable unique key to match an existing record against, so importing
// never updates — every row becomes a new customer.
export function parseCustomersCsv(text) {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (result.errors.length > 0) {
    throw new Error(`Couldn't parse that CSV: ${result.errors[0].message}`);
  }

  const headers = result.meta.fields || [];
  if (!headers.includes("Company") && !headers.includes("First Name") && !headers.includes("Last Name")) {
    throw new Error(
      `Missing required column(s) — need at least one of Company, First Name, Last Name. Expected headers: ${CUSTOMER_CSV_FIELDS.map((f) => f.label).join(", ")}`
    );
  }

  return result.data.map((row) => {
    const out = {};
    for (const field of CUSTOMER_CSV_FIELDS) {
      if (field.key === "balance") continue;
      const raw = row[field.label];
      if (field.boolean) out[field.key] = /^(y|yes|true|1)$/i.test((raw ?? "").trim());
      else out[field.key] = (raw ?? "").trim();
    }
    return out;
  });
}
