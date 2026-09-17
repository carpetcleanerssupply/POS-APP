import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { parseCustomersCsv } from "@/lib/csv";
import { isValidCustomer } from "@/lib/customers";

export async function POST(request) {
  const { unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "Choose a CSV file to upload." }, { status: 400 });
  }

  const text = await file.text();
  let rows;
  try {
    rows = parseCustomersCsv(text);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const usable = rows.filter(isValidCustomer);
  if (usable.length === 0) {
    return Response.json({ error: "No usable rows found — each row needs a Company, First Name, or Last Name." }, { status: 400 });
  }

  let created = 0;
  const errors = [];

  for (const row of usable) {
    try {
      await prisma.customer.create({
        data: {
          company: row.company || null,
          firstName: row.firstName || null,
          lastName: row.lastName || null,
          workPhone: row.workPhone || null,
          cellPhone: row.cellPhone || null,
          email: row.email || null,
          email2: row.email2 || null,
          unsubscribed: row.unsubscribed,
          billingStreet: row.billingStreet || null,
          billingStreet2: row.billingStreet2 || null,
          billingCity: row.billingCity || null,
          billingState: row.billingState || null,
          billingZip: row.billingZip || null,
          shipSameAsBilling: row.shipSameAsBilling,
          shippingStreet: row.shipSameAsBilling ? row.billingStreet || null : row.shippingStreet || null,
          shippingStreet2: row.shipSameAsBilling ? row.billingStreet2 || null : row.shippingStreet2 || null,
          shippingCity: row.shipSameAsBilling ? row.billingCity || null : row.shippingCity || null,
          shippingState: row.shipSameAsBilling ? row.billingState || null : row.shippingState || null,
          shippingZip: row.shipSameAsBilling ? row.billingZip || null : row.shippingZip || null,
          taxExempt: row.taxExempt,
          resaleCert: row.resaleCert || null,
        },
      });
      created++;
    } catch (error) {
      errors.push(`${row.company || `${row.firstName} ${row.lastName}`.trim()}: ${error.message}`);
    }
  }

  return Response.json({ created, updated: 0, errors }, { status: 200 });
}
