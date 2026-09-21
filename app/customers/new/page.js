import Link from "next/link";
import { requireSession } from "@/lib/auth";
import CustomerForm from "../CustomerForm";

export default async function NewCustomerPage({ searchParams }) {
  await requireSession();
  const params = await searchParams;

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/customers" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Customers</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Customer Database</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Add Customer</h1>
      </div>
      <CustomerForm action="/api/customers" error={params?.error} />
    </main>
  );
}
