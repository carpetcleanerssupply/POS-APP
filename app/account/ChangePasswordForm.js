"use client";

import { useState } from "react";

const fieldStyle = { display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" };

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) return setError("New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setError("New passwords don't match.");

    setBusy(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setBusy(false);
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setBusy(false);
    } catch {
      setError("Network error — password was not changed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      {error && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>{error}</p>
      )}
      {success && (
        <p style={{ color: "#2e7d32", background: "#e8f5e9", padding: "0.75rem 1rem", borderRadius: 8 }}>
          Password changed.
        </p>
      )}
      <label>
        Current Password
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
          style={fieldStyle}
        />
      </label>
      <label>
        New Password
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          style={fieldStyle}
        />
      </label>
      <label>
        Confirm New Password
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          style={fieldStyle}
        />
      </label>
      <button type="submit" disabled={busy} style={{ padding: "0.6rem 1.2rem", cursor: "pointer", alignSelf: "flex-start" }}>
        {busy ? "Saving..." : "Change Password"}
      </button>
    </form>
  );
}
