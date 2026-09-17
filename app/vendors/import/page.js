import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { VENDOR_CSV_FIELDS } from "@/lib/csv";
import ImportCsvForm from "../../ImportCsvForm";

export default async function ImportVendorsPage() {
  await requireSession();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 600 }}>
      <p><Link href="/vendors">&larr; Back to Vendors</Link></p>
      <h1>Import Vendors</h1>
      <p style={{ color: "#555" }}>
        The CSV needs a header row with these exact column names (Vendor Name is required, the rest are optional).
        A row whose name matches an existing vendor updates it; a new name creates one.
      </p>
      <p style={{ fontFamily: "monospace", fontSize: "0.85rem", background: "#f7f7f7", padding: "0.75rem", borderRadius: 8 }}>
        {VENDOR_CSV_FIELDS.map((f) => f.label).join(", ")}
      </p>
      <p style={{ color: "#555" }}>
        Exporting your current vendors first (<Link href="/api/vendors/export">Export CSV</Link>) gives you a file in
        exactly this format to start from.
      </p>
      <ImportCsvForm action="/api/vendors/import" noun="vendor" />
    </main>
  );
}
