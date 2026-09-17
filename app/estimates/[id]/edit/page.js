import { notFound } from "next/navigation";
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
      <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <p>This estimate has been converted and can no longer be edited. <a href={`/estimates/${id}`}>View it</a>.</p>
      </main>
    );
  }

  const items = await prisma.item.findMany({ orderBy: { name: "asc" } });
  const plainItems = items.map((i) => ({ id: i.id, sku: i.sku, name: i.name, price: Number(i.price), stock: i.stock }));

  const initialLines = estimate.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, discountPct: Number(l.discountPct), note: l.note || "" }));

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 800 }}>
      <p><a href={`/estimates/${id}`}>&larr; Back to Estimate #{estimate.number}</a></p>
      <h1>Edit Estimate #{estimate.number}</h1>
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
