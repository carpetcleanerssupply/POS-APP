import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import ItemForm from "../../ItemForm";

export default async function EditItemPage({ params, searchParams }) {
  const session = await requireSession();
  const { id } = await params;
  const query = await searchParams;

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) notFound();

  const plainItem = { ...item, cost: Number(item.cost), price: Number(item.price) };

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/items" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Items</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Item Database</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Edit Item</h1>
      </div>
      <ItemForm
        action={`/api/items/${id}`}
        item={plainItem}
        error={query?.error}
        submitLabel="Save Changes"
        showMargin={isOwnerManager(session)}
      />
    </main>
  );
}
