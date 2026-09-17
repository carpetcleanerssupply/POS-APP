import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { ITEM_CSV_FIELDS } from "@/lib/csv";
import ImportCsvForm from "../../ImportCsvForm";

export default async function ImportItemsPage() {
  await requireSession();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 600 }}>
      <p><Link href="/items">&larr; Back to Items</Link></p>
      <h1>Import Items</h1>
      <p style={{ color: "#555" }}>
        The CSV needs a header row with these exact column names (SKU and Item Name are required, the rest are
        optional). A row with a SKU that already exists updates that item; a new SKU creates one.
      </p>
      <p style={{ fontFamily: "monospace", fontSize: "0.85rem", background: "#f7f7f7", padding: "0.75rem", borderRadius: 8 }}>
        {ITEM_CSV_FIELDS.map((f) => f.label).join(", ")}
      </p>
      <p style={{ color: "#555" }}>
        Exporting your current items first (<Link href="/api/items/export">Export CSV</Link>) gives you a file in exactly
        this format to start from.
      </p>
      <ImportCsvForm action="/api/items/import" noun="item" />
    </main>
  );
}
