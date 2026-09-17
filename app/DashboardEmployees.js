"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ marginTop: 0 }}>Employees</h3>
        {canManage && (
          <button type="button" onClick={() => setShowAdd((s) => !s)} style={{ cursor: "pointer" }}>
            {showAdd ? "Cancel" : "+ Add"}
          </button>
        )}
      </div>

      {error && <p style={{ color: "#c62828" }}>{error}</p>}

      {showAdd && canManage && (
        <form onSubmit={addUser} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ padding: "0.4rem" }} required />
          <input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: "0.4rem" }} required />
          <select value={tier} onChange={(e) => setTier(e.target.value)} style={{ padding: "0.4rem" }}>
            <option value="STAFF">Staff</option>
            <option value="OWNER_MANAGER">Owner/Manager</option>
          </select>
          <input type="password" placeholder="Temporary password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: "0.4rem" }} required minLength={8} />
          <button type="submit" disabled={busy} style={{ padding: "0.4rem", cursor: "pointer" }}>Create Login</button>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {users.map((u) => (
          <div key={u.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", opacity: u.active ? 1 : 0.5 }}>
            <span>
              {u.name} <span style={{ color: "#777", fontSize: "0.8rem" }}>({u.tier === "OWNER_MANAGER" ? "Owner/Manager" : "Staff"})</span>
              {!u.active && " — inactive"}
            </span>
            {canManage && u.id !== currentUserId && (
              <button type="button" disabled={busy} onClick={() => setActive(u.id, !u.active)} style={{ cursor: "pointer", fontSize: "0.85rem" }}>
                {u.active ? "Deactivate" : "Reactivate"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
