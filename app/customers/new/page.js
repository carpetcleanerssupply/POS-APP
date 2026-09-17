import { requireSession } from "@/lib/auth";
import CustomerForm from "../CustomerForm";

export default async function NewCustomerPage({ searchParams }) {
  await requireSession();
  const params = await searchParams;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 720 }}>
      <p><a href="/customers">&larr; Back to Customers</a></p>
      <h1>Add Customer</h1>
      <CustomerForm action="/api/customers" error={params?.error} submitLabel="Add Customer" />
    </main>
  );
}
