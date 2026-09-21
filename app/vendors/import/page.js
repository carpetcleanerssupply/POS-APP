import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { VENDOR_CSV_FIELDS } from "@/lib/csv";
import ImportCsvForm from "../../ImportCsvForm";

export default async function ImportVendorsPage() {
  await requireSession();

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/vendors" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Vendors</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Vendor Database</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Import Vendors</h1>
      </div>
      <p className="text-sm mb-3" style={{ color: "var(--faint)" }}>
        The CSV needs a header row with these exact column names (Vendor Name is required, the rest are optional).
        A row whose name matches an existing vendor updates it; a new name creates one.
      </p>
      <p className="mono text-sm mb-3 px-3 py-3 rounded-lg" style={{ backgroundColor: "var(--paper)" }}>
        {VENDOR_CSV_FIELDS.map((f) => f.label).join(", ")}
      </p>
      <p className="text-sm mb-5" style={{ color: "var(--faint)" }}>
        Exporting your current vendors first (<Link href="/api/vendors/export" className="underline" style={{ color: "var(--deep)" }}>Export CSV</Link>) gives you a file in
        exactly this format to start from.
      </p>
      <ImportCsvForm action="/api/vendors/import" noun="vendor" />
    </main>
  );
}
