import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 480 }}>
      <h1>Page not found</h1>
      <p style={{ color: "#555" }}>Nothing lives at this address.</p>
      <p><Link href="/">&larr; Back to Home</Link></p>
    </main>
  );
}
