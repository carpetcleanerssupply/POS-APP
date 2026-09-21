"use client";

import { useState } from "react";

const inputClass = "w-full px-3 py-2 rounded border text-sm focus-amber hairline";
const inputStyle = { backgroundColor: "var(--panel)" };

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && (
        <p className="px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>{error}</p>
      )}
      {success && (
        <p className="px-4 py-3 rounded-lg text-sm" style={{ color: "var(--moss)", backgroundColor: "var(--moss-bg)" }}>
          Password changed.
        </p>
      )}
      <div>
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Current Password</div>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
          className={inputClass}
          style={inputStyle}
        />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>New Password</div>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
          style={inputStyle}
        />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Confirm New Password</div>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
          style={inputStyle}
        />
      </div>
      <button type="submit" disabled={busy} className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
        {busy ? "Saving..." : "Change Password"}
      </button>
    </form>
  );
}
