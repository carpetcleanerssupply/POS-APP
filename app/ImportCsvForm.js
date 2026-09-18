"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ImportCsvForm({ action, noun = "row" }) {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return setError("Choose a CSV file first.");
    setBusy(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(action, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong importing that file.");
        setBusy(false);
        return;
      }
      setResult(data);
      setBusy(false);
      router.refresh();
    } catch {
      setError("Network error — nothing was imported.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 480 }}>
      {error && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>{error}</p>
      )}
      {result && (
        <p style={{ color: "#2e7d32", background: "#e8f5e9", padding: "0.75rem 1rem", borderRadius: 8 }}>
          Imported: {result.created} new {noun}
          {result.created === 1 ? "" : "s"}, {result.updated} updated.
          {result.errors.length > 0 && (
            <>
              <br />
              {result.errors.length} row{result.errors.length === 1 ? "" : "s"} had errors: {result.errors.join("; ")}
            </>
          )}
        </p>
      )}
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button type="submit" className="btn btn-primary" disabled={busy} style={{ alignSelf: "flex-start" }}>
        {busy ? "Importing..." : "Import"}
      </button>
    </form>
  );
}
