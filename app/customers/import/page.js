import { requireSession } from "@/lib/auth";
import { CUSTOMER_CSV_FIELDS } from "@/lib/csv";
import ImportCsvForm from "../../ImportCsvForm";

export default async function ImportCustomersPage() {
  await requireSession();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 600 }}>
      <p><a href="/customers">&larr; Back to Customers</a></p>
      <h1>Import Customers</h1>
      <p style={{ color: "#555" }}>
        The CSV needs a header row with these exact column names (at least one of Company, First Name, or Last Name
        is required). Unlike Items and Vendors, every row always creates a new customer — there's no reliable way to
        match a row to an existing customer by name alone, so this never updates one.
      </p>
      <p style={{ fontFamily: "monospace", fontSize: "0.85rem", background: "#f7f7f7", padding: "0.75rem", borderRadius: 8 }}>
        {CUSTOMER_CSV_FIELDS.map((f) => f.label).join(", ")}
      </p>
      <p style={{ color: "#555" }}>
        Exporting your current customers first (<a href="/api/customers/export">Export CSV</a>) gives you a file in
        exactly this format to start from. The Balance column is for reference only — it's never imported, since a
        balance only ever comes from real transaction history.
      </p>
      <ImportCsvForm action="/api/customers/import" noun="customer" />
    </main>
  );
}
