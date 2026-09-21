"use client";

export default function DeleteItemButton({ itemId, itemName }) {
  return (
    <form
      action={`/api/items/${itemId}/delete`}
      method="POST"
      onSubmit={(e) => {
        if (!confirm(`Delete "${itemName}"? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-xs font-semibold" style={{ color: "var(--rust)", cursor: "pointer" }}>
        Delete
      </button>
    </form>
  );
}
