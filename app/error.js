"use client";

import Link from "next/link";

export default function Error({ reset }) {
  return (
    <main className="p-6" style={{ maxWidth: 480, margin: "4rem auto 0" }}>
      <div className="card p-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--deep)" }}>Something went wrong</h1>
        <p className="text-sm mt-2" style={{ color: "var(--faint)" }}>
          An unexpected error occurred. Try again, or head back to the home page.
        </p>
        <div className="flex gap-3 mt-4">
          <button type="button" onClick={() => reset()} className="btn btn-primary">Try again</button>
          <Link href="/" className="btn">Home</Link>
        </div>
      </div>
    </main>
  );
}
