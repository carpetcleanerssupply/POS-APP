import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import VendorForm from "../../VendorForm";

export default async function EditVendorPage({ params, searchParams }) {
  await requireSession();
  const { id } = await params;
  const query = await searchParams;

  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) notFound();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 640 }}>
      <p><Link href="/vendors">&larr; Back to Vendors</Link></p>
      <h1>Edit Vendor — {vendor.name}</h1>
      <VendorForm action={`/api/vendors/${id}`} vendor={vendor} error={query?.error} submitLabel="Save Changes" />
    </main>
  );
}
