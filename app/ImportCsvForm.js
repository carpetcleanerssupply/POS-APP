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
    <form onSubmit={handleSubmit} className="card p-5 flex flex-col gap-3" style={{ maxWidth: 480 }}>
      {error && (
        <p className="px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>{error}</p>
      )}
      {result && (
        <p className="px-4 py-3 rounded-lg text-sm" style={{ color: "var(--moss)", backgroundColor: "var(--moss-bg)" }}>
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
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
      <button type="submit" disabled={busy} className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
        {busy ? "Importing..." : "Import"}
      </button>
    </form>
  );
}
