"use client";

import Link from "next/link";

export default function Error({ reset }) {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 480 }}>
      <h1>Something went wrong</h1>
      <p style={{ color: "#555" }}>
        An unexpected error occurred. Try again, or head back to the home page.
      </p>
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <button type="button" onClick={() => reset()} style={{ padding: "0.55rem 1rem", cursor: "pointer" }}>
          Try again
        </button>
        <Link href="/">Home</Link>
      </div>
    </main>
  );
}
