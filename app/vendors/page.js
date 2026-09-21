import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { vendorBalanceDue } from "@/lib/vendors";
import VendorSearchList from "./VendorSearchList";
import VendorDetailCard from "./VendorDetailCard";

const DELETE_ERROR_MESSAGES = {
  in_use: (params) => `Can't delete — ${params.items} item(s) and ${params.pos} PO(s) still reference this vendor. Update those first.`,
  not_found: () => "That vendor no longer exists.",
};

const FORM_ERRORS = new Set(["required", "duplicate_name"]);

export default async function VendorsPage({ searchParams }) {
  await requireSession();
  const params = await searchParams;
  const selectedId = params?.selected || null;

  const allVendors = await prisma.vendor.findMany({ orderBy: { name: "asc" } });

  const searchList = allVendors.map((v) => ({
    id: v.id,
    name: v.name,
    subtitle: v.contactName || v.phone || v.email || "No contact info",
    searchText: [v.name, v.email, v.contactName].filter(Boolean).join(" ").toLowerCase(),
  }));

  const errorMessage = params?.error && DELETE_ERROR_MESSAGES[params.error]?.(params);

  const selectedVendor = selectedId ? allVendors.find((v) => v.id === selectedId) : null;
  const balanceDue = selectedVendor ? await vendorBalanceDue(prisma, selectedVendor) : 0;

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Home</Link>
      </p>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <div className="eyebrow mb-1">Vendor Database</div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>
            Vendors ({allVendors.length})
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/api/vendors/export" className="btn">Export CSV</Link>
          <Link href="/vendors/import" className="btn">Import CSV</Link>
          <Link href="/vendors/new" className="btn btn-primary">+ New Vendor</Link>
        </div>
      </div>

      {errorMessage && (
        <p className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>
          {errorMessage}
        </p>
      )}
      {params?.saved === "1" && (
        <p className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ color: "var(--moss)", backgroundColor: "var(--moss-bg)" }}>
          Vendor saved.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <VendorSearchList vendors={searchList} selectedId={selectedId} />

        <div>
          {selectedVendor ? (
            <VendorDetailCard
              vendor={selectedVendor}
              balanceDue={balanceDue}
              initialEditMode={params?.edit === "1"}
              error={params?.error && FORM_ERRORS.has(params.error) ? params.error : undefined}
            />
          ) : (
            <div className="card p-8 text-center text-sm" style={{ color: "var(--faint)" }}>
              {allVendors.length === 0 ? "No vendors yet — add one to get started." : "Select a vendor from the list."}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
