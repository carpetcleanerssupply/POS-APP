import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import ItemForm from "../../ItemForm";

export default async function EditItemPage({ params, searchParams }) {
  await requireSession();
  const { id } = await params;
  const query = await searchParams;

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 640 }}>
      <p><a href="/items">&larr; Back to Items</a></p>
      <h1>Edit Item</h1>
      <ItemForm action={`/api/items/${id}`} item={item} error={query?.error} submitLabel="Save Changes" />
    </main>
  );
}
