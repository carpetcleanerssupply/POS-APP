import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";
import { parseVendorsCsv } from "@/lib/csv";

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
    rows = parseVendorsCsv(text);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const usable = rows.filter((r) => r.name);
  if (usable.length === 0) {
    return Response.json({ error: "No usable rows found — each row needs at least a Vendor Name." }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  const errors = [];

  for (const row of usable) {
    try {
      const data = {
        contactName: row.contactName || null,
        phone: row.phone || null,
        email: row.email || null,
        email2: row.email2 || null,
        addressStreet: row.addressStreet || null,
        addressStreet2: row.addressStreet2 || null,
        addressCity: row.addressCity || null,
        addressState: row.addressState || null,
        addressZip: row.addressZip || null,
        notes: row.notes || null,
      };
      const existing = await prisma.vendor.findUnique({ where: { name: row.name } });
      await prisma.vendor.upsert({ where: { name: row.name }, update: data, create: { name: row.name, ...data } });
      if (existing) updated++;
      else created++;
    } catch (error) {
      errors.push(`${row.name}: ${error.message}`);
    }
  }

  return Response.json({ created, updated, errors }, { status: 200 });
}
