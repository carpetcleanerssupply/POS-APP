import Link from "next/link";
import { requireSession } from "@/lib/auth";
import VendorForm from "../VendorForm";

export default async function NewVendorPage({ searchParams }) {
  await requireSession();
  const params = await searchParams;

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/vendors" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Vendors</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Vendor Database</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Add Vendor</h1>
      </div>
      <VendorForm action="/api/vendors" error={params?.error} />
    </main>
  );
}
