import Link from "next/link";

export default function NotFound() {
  return (
    <main className="p-6" style={{ maxWidth: 480, margin: "4rem auto 0" }}>
      <div className="card p-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--deep)" }}>Page not found</h1>
        <p className="text-sm mt-2" style={{ color: "var(--faint)" }}>Nothing lives at this address.</p>
        <p className="mt-4">
          <Link href="/" className="text-sm font-semibold" style={{ color: "var(--deep)" }}>&larr; Back to Home</Link>
        </p>
      </div>
    </main>
  );
}
