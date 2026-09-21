import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import EstimateForm from "../../EstimateForm";

export const dynamic = "force-dynamic";

export default async function EditEstimatePage({ params }) {
  await requireSession();
  const { id } = await params;

  const estimate = await prisma.estimate.findUnique({ where: { id }, include: { lines: true, customer: true } });
  if (!estimate) notFound();

  if (estimate.status !== "OPEN") {
    return (
      <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
        <p className="text-sm">
          This estimate has been converted and can no longer be edited.{" "}
          <Link href={`/estimates/${id}`} className="underline" style={{ color: "var(--deep)" }}>View it</Link>.
        </p>
      </main>
    );
  }

  const items = await prisma.item.findMany({ orderBy: { name: "asc" } });
  const plainItems = items.map((i) => ({ id: i.id, sku: i.sku, name: i.name, price: Number(i.price), stock: i.stock }));

  const initialLines = estimate.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, discountPct: Number(l.discountPct), note: l.note || "" }));

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href={`/estimates/${id}`} className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Estimate #{estimate.number}</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Estimates</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Edit Estimate #{estimate.number}</h1>
      </div>
      <EstimateForm
        items={plainItems}
        customer={{ id: estimate.customer.id, name: estimate.customerName, taxExempt: estimate.customer.taxExempt }}
        estimateId={estimate.id}
        initialLines={initialLines}
        initialExpiration={estimate.expirationDate ? estimate.expirationDate.toISOString().slice(0, 10) : ""}
        initialNotes={estimate.notes || ""}
        initialShippingCharge={String(Number(estimate.shippingCharge))}
      />
    </main>
  );
}
