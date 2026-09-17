import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import NavBar from "./NavBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Carpet Cleaners Supply — POS",
  description: "Internal point-of-sale system",
};

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {session && (
          <div
            className="no-print"
            style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #ddd" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
                padding: "0.6rem 1rem 0",
              }}
            >
              <strong>Carpet Cleaners Supply — POS</strong>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.9rem" }}>
                <span>
                  {session.user.name} ({isOwnerManager(session) ? "Owner/Manager" : "Staff"})
                </span>
                <Link href="/account">My Account</Link>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" style={{ padding: "0.35rem 0.7rem", cursor: "pointer" }}>
                    Sign out
                  </button>
                </form>
              </div>
            </div>
            <NavBar tierOwner={isOwnerManager(session)} />
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
