"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass = "w-full px-3 py-2 rounded border text-sm focus-amber hairline";
const inputStyle = { backgroundColor: "var(--panel)" };

export default function DashboardEmployees({ users, canManage, currentUserId }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [tier, setTier] = useState("STAFF");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function addUser(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, name, tier, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      setBusy(false);
      return;
    }
    setUsername("");
    setName("");
    setPassword("");
    setShowAdd(false);
    setBusy(false);
    router.refresh();
  }

  async function setActive(id, active) {
    setBusy(true);
    const res = await fetch(`/api/users/${id}/set-active`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) alert(data.error || "Something went wrong.");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="eyebrow">Employees</div>
        {canManage && (
          <button type="button" onClick={() => setShowAdd((s) => !s)} className="btn btn-sm">
            {showAdd ? "Cancel" : "+ Add"}
          </button>
        )}
      </div>

      {error && <p className="text-sm mb-2" style={{ color: "var(--rust)" }}>{error}</p>}

      {showAdd && canManage && (
        <form onSubmit={addUser} className="flex flex-col gap-2 mb-4">
          <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} style={inputStyle} required />
          <input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} style={inputStyle} required />
          <select value={tier} onChange={(e) => setTier(e.target.value)} className={inputClass} style={inputStyle}>
            <option value="STAFF">Staff</option>
            <option value="OWNER_MANAGER">Owner/Manager</option>
          </select>
          <input type="password" placeholder="Temporary password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} style={inputStyle} required minLength={8} />
          <button type="submit" disabled={busy} className="btn btn-sm btn-primary" style={{ alignSelf: "flex-start" }}>Create Login</button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between text-sm border-b hairline pb-2 last:border-0" style={{ opacity: u.active ? 1 : 0.5 }}>
            <span>
              {u.name} <span className="text-xs" style={{ color: "var(--faint)" }}>({u.tier === "OWNER_MANAGER" ? "Owner/Manager" : "Staff"})</span>
              {!u.active && " — inactive"}
            </span>
            {canManage && u.id !== currentUserId && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setActive(u.id, !u.active)}
                className="text-xs font-semibold"
                style={{ color: u.active ? "var(--rust)" : "var(--deep)", cursor: "pointer" }}
              >
                {u.active ? "Deactivate" : "Reactivate"}
              </button>
            )}
          </div>
        ))}
        {users.length === 0 && <div className="text-sm" style={{ color: "var(--faint)" }}>No employees added yet.</div>}
      </div>
    </div>
  );
}
