import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { displayName } from "@/lib/customers";
import CustomerForm from "../../CustomerForm";

export default async function EditCustomerPage({ params, searchParams }) {
  await requireSession();
  const { id } = await params;
  const query = await searchParams;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 720 }}>
      <p><Link href="/customers">&larr; Back to Customers</Link></p>
      <h1>Edit Customer — {displayName(customer)}</h1>
      <CustomerForm
        action={`/api/customers/${id}`}
        customer={customer}
        error={query?.error}
        saved={query?.saved === "1"}
        submitLabel="Save Changes"
      />
    </main>
  );
}
