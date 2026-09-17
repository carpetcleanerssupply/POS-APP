"use client";

export default function PrintButton({ label = "Print" }) {
  return (
    <button type="button" onClick={() => window.print()} style={{ cursor: "pointer" }}>
      {label}
    </button>
  );
}
