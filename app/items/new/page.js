import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import ItemForm from "../ItemForm";

export default async function NewItemPage({ searchParams }) {
  const session = await requireSession();
  const params = await searchParams;

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/items" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Back to Items</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Item Database</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>Add Item</h1>
      </div>
      <ItemForm action="/api/items" error={params?.error} submitLabel="Add Item" showMargin={isOwnerManager(session)} />
    </main>
  );
}
