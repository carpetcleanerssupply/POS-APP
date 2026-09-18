"use client";

export default function PrintButton({ label = "Print" }) {
  return (
    <button type="button" className="btn btn-sm" onClick={() => window.print()}>
      {label}
    </button>
  );
}
