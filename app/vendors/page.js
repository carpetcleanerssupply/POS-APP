import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import DeleteVendorButton from "./DeleteVendorButton";

const DELETE_ERROR_MESSAGES = {
  in_use: (params) => `Can't delete — ${params.items} item(s) and ${params.pos} PO(s) still reference this vendor. Update those first.`,
  not_found: () => "That vendor no longer exists.",
};

const th = { textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #ddd", fontSize: "0.85rem" };
const td = { padding: "0.5rem 0.75rem", borderBottom: "1px solid #eee" };

export default async function VendorsPage({ searchParams }) {
  await requireSession();
  const params = await searchParams;
  const q = (params?.q || "").trim().toLowerCase();

  const allVendors = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
  const vendors = allVendors.filter(
    (v) => !q || v.name.toLowerCase().includes(q) || (v.email || "").toLowerCase().includes(q)
  );

  const errorMessage = params?.error && DELETE_ERROR_MESSAGES[params.error]?.(params);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 900 }}>
      <p><Link href="/">&larr; Home</Link></p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1>Vendors</h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/api/vendors/export" className="btn btn-sm">Export CSV</Link>
          <Link href="/vendors/import" className="btn btn-sm">Import CSV</Link>
          <Link href="/vendors/new" style={{ padding: "0.55rem 1rem", background: "#1e3a5f", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
            + Add Vendor
          </Link>
        </div>
      </div>

      {errorMessage && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>
          {errorMessage}
        </p>
      )}

      <form method="GET" style={{ display: "flex", gap: "0.75rem", margin: "1.25rem 0" }}>
        <input type="text" name="q" defaultValue={params?.q || ""} placeholder="Search name or email..." style={{ padding: "0.5rem", flex: 1, maxWidth: 320 }} />
        <button type="submit" className="btn btn-sm">Search</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Contact</th>
            <th style={th}>Phone</th>
            <th style={th}>Email</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((v) => (
            <tr key={v.id}>
              <td style={td}><Link href={`/vendors/${v.id}/edit`}>{v.name}</Link></td>
              <td style={td}>{v.contactName || "—"}</td>
              <td style={td}>{v.phone || "—"}</td>
              <td style={td}>{v.email || "—"}</td>
              <td style={{ ...td, display: "flex", gap: "0.75rem" }}>
                <Link href={`/vendors/${v.id}/edit`}>Edit</Link>
                <DeleteVendorButton vendorId={v.id} vendorName={v.name} />
              </td>
            </tr>
          ))}
          {vendors.length === 0 && (
            <tr>
              <td style={td} colSpan={5}>{allVendors.length === 0 ? "No vendors yet." : "No vendors match your search."}</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
