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
      <button type="submit" style={{ color: "#c62828", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
        Delete
      </button>
    </form>
  );
}
