"use client";

export default function DeleteCustomerButton({ customerId, customerName }) {
  return (
    <form
      action={`/api/customers/${customerId}/delete`}
      method="POST"
      onSubmit={(e) => {
        if (!confirm(`Delete "${customerName}"? This can't be undone.`)) {
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
