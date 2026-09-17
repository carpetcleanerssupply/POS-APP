import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { TAX_RATE, buildInvoiceLines, InvoiceValidationError } from "@/lib/invoices";
import { displayName } from "@/lib/customers";

// Updates a DRAFT in place (customer, lines, shipping/notes). Never touches
// stock or money — that only happens when the draft is actually closed.
export async function POST(request, { params }) {
  const { unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return Response.json({ error: "That invoice no longer exists." }, { status: 404 });
  if (invoice.status !== "DRAFT") {
    return Response.json({ error: "Only a draft invoice can be edited this way." }, { status: 400 });
  }

  const {
    customerId,
    saleType = "WALKIN",
    customerPO = "",
    shipVia = "",
    trackingNumber = "",
    notes = "",
    shippingCharge: rawShippingCharge = 0,
    lines: rawLines = [],
    dueDate = null,
  } = body;

  if (!customerId) return Response.json({ error: "Select a customer." }, { status: 400 });
  const dedupedLines = (rawLines || []).filter((l) => l && l.itemId && Number(l.qty) > 0);
  if (dedupedLines.length === 0) {
    return Response.json({ error: "Add at least one line item with a quantity greater than 0." }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return Response.json({ error: "That customer no longer exists." }, { status: 404 });

  const shippingCharge = Math.max(0, Number(rawShippingCharge) || 0);

  try {
    await prisma.$transaction(async (tx) => {
      const { lineData, subtotal } = await buildInvoiceLines(tx, dedupedLines, { decrementStock: false });
      const tax = customer.taxExempt ? 0 : subtotal * TAX_RATE;
      const total = subtotal + shippingCharge + tax;

      await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
      await tx.invoice.update({
        where: { id },
        data: {
          saleType,
          dueDate: dueDate ? new Date(dueDate) : null,
          customerPO: customerPO || null,
          shipVia: shipVia || null,
          trackingNumber: trackingNumber || null,
          notes: notes || null,
          customerId: customer.id,
          customerName: displayName(customer),
          customerEmail: customer.email,
          customerEmail2: customer.email2,
          subtotal,
          shippingCharge,
          tax,
          total,
          lines: { create: lineData },
        },
      });
    });

    return Response.json({ id }, { status: 200 });
  } catch (error) {
    if (error instanceof InvoiceValidationError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
