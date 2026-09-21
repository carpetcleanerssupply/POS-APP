import Link from "next/link";
import { requireSession } from "@/lib/auth";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <main className="p-6 md:p-10" style={{ maxWidth: 1600, margin: "0 auto" }}>
      <p className="mb-3">
        <Link href="/" className="text-sm" style={{ color: "var(--faint)" }}>&larr; Home</Link>
      </p>
      <div className="mb-5">
        <div className="eyebrow mb-1">Account</div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--deep)" }}>My Account</h1>
        <p className="text-sm mt-2" style={{ color: "var(--faint)" }}>
          Signed in as <strong style={{ color: "var(--ink)" }}>{session.user.name}</strong> ({session.user.username}) —{" "}
          {session.user.tier === "OWNER_MANAGER" ? "Owner/Manager" : "Staff"}
        </p>
      </div>

      <div className="card p-5" style={{ maxWidth: 400 }}>
        <div className="eyebrow mb-3">Change Password</div>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
