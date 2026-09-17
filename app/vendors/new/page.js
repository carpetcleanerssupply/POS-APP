import { requireSession } from "@/lib/auth";
import VendorForm from "../VendorForm";

export default async function NewVendorPage({ searchParams }) {
  await requireSession();
  const params = await searchParams;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 640 }}>
      <p><a href="/vendors">&larr; Back to Vendors</a></p>
      <h1>Add Vendor</h1>
      <VendorForm action="/api/vendors" error={params?.error} submitLabel="Add Vendor" />
    </main>
  );
}
