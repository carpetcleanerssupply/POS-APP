"use client";

export default function DeleteVendorButton({ vendorId, vendorName }) {
  return (
    <form
      action={`/api/vendors/${vendorId}/delete`}
      method="POST"
      onSubmit={(e) => {
        if (!confirm(`Delete "${vendorName}"? This can't be undone.`)) {
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
