import { requireSession } from "@/lib/auth";
import ItemForm from "../ItemForm";

export default async function NewItemPage({ searchParams }) {
  await requireSession();
  const params = await searchParams;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 640 }}>
      <p><a href="/items">&larr; Back to Items</a></p>
      <h1>Add Item</h1>
      <ItemForm action="/api/items" error={params?.error} submitLabel="Add Item" />
    </main>
  );
}
