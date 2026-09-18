import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import ItemForm from "../ItemForm";

export default async function NewItemPage({ searchParams }) {
  const session = await requireSession();
  const params = await searchParams;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 640 }}>
      <p><Link href="/items">&larr; Back to Items</Link></p>
      <h1>Add Item</h1>
      <ItemForm action="/api/items" error={params?.error} submitLabel="Add Item" showMargin={isOwnerManager(session)} />
    </main>
  );
}
