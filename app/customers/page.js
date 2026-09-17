import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { displayName } from "@/lib/customers";
import DeleteCustomerButton from "./DeleteCustomerButton";

const DELETE_ERROR_MESSAGES = {
  has_balance: () => "Can't delete — this customer has a balance on their account. Settle it first before deleting.",
  has_history: (params) =>
    `Can't delete — this customer has ${params.invoices} invoice(s) and ${params.estimates} estimate(s) on file. Deleting would orphan that history.`,
  not_found: () => "That customer no longer exists.",
};

const th = { textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };
const td = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #eee" };

export default async function CustomersPage({ searchParams }) {
  await requireSession();
  const params = await searchParams;
  const q = (params?.q || "").trim().toLowerCase();

  const allCustomers = await prisma.customer.findMany({ orderBy: [{ company: "asc" }, { lastName: "asc" }] });

  const customers = allCustomers.filter((c) => {
    if (!q) return true;
    return (
      displayName(c).toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.workPhone || "").includes(q) ||
      (c.cellPhone || "").includes(q)
    );
  });

  const errorMessage = params?.error && DELETE_ERROR_MESSAGES[params.error]?.(params);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 960 }}>
      <p><a href="/">&larr; Home</a></p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1>Customers</h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a href="/api/customers/export">Export CSV</a>
          <a href="/customers/import">Import CSV</a>
          <a href="/customers/new" style={{ padding: "0.55rem 1rem", background: "#1a1a1a", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
            + Add Customer
          </a>
        </div>
      </div>

      {errorMessage && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>
          {errorMessage}
        </p>
      )}

      <form method="GET" style={{ display: "flex", gap: "0.75rem", alignItems: "center", margin: "1.25rem 0" }}>
        <input
          type="text"
          name="q"
          defaultValue={params?.q || ""}
          placeholder="Search name, company, phone, email..."
          style={{ padding: "0.5rem", flex: 1, maxWidth: 320 }}
        />
        <button type="submit" style={{ padding: "0.5rem 0.9rem", cursor: "pointer" }}>Search</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Phone</th>
            <th style={th}>Email</th>
            <th style={th}>Balance</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td style={td}><a href={`/customers/${c.id}/edit`}>{displayName(c)}</a></td>
              <td style={td}>{c.cellPhone || c.workPhone || "—"}</td>
              <td style={td}>{c.email || "—"}</td>
              <td style={td}>${Number(c.balance).toFixed(2)}</td>
              <td style={{ ...td, display: "flex", gap: "0.75rem" }}>
                <a href={`/customers/${c.id}/edit`}>Edit</a>
                <DeleteCustomerButton customerId={c.id} customerName={displayName(c)} />
              </td>
            </tr>
          ))}
          {customers.length === 0 && (
            <tr>
              <td style={td} colSpan={5}>
                {allCustomers.length === 0 ? "No customers yet." : "No customers match your search."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
