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
      <button type="submit" className="btn btn-sm btn-danger">
        Delete
      </button>
    </form>
  );
}
