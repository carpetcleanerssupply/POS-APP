import { prisma } from "@/lib/prisma";
import { requireSessionJson } from "@/lib/auth";

export async function POST(request, { params }) {
  const { unauthorized } = await requireSessionJson();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return Response.json({ error: "That invoice no longer exists." }, { status: 404 });
  if (invoice.status !== "DRAFT") {
    return Response.json({ error: "Only a draft invoice can be deleted — a closed one is a real record." }, { status: 400 });
  }

  await prisma.invoice.delete({ where: { id } });
  return Response.json({ ok: true });
}
