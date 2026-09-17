import { requireSession } from "@/lib/auth";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 480 }}>
      <p><a href="/">&larr; Home</a></p>
      <h1>My Account</h1>
      <p style={{ color: "#555" }}>
        Signed in as <strong>{session.user.name}</strong> ({session.user.username}) —{" "}
        {session.user.tier === "OWNER_MANAGER" ? "Owner/Manager" : "Staff"}
      </p>

      <h3 style={{ marginTop: "1.5rem" }}>Change Password</h3>
      <ChangePasswordForm />
    </main>
  );
}
