import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { isOwnerManager } from "@/lib/authz";
import NavBar from "./NavBar";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata = {
  title: "Carpet Cleaners Supply — POS",
  description: "Internal point-of-sale system",
};

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        {session && (
          <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 10 }}>
            <div
              className="flex items-center justify-between gap-2 px-4 md:px-6 py-2"
              style={{ backgroundColor: "var(--deep)" }}
            >
              <div style={{ backgroundColor: "#fff", borderRadius: 6, padding: "4px 10px", display: "flex", alignItems: "center" }}>
                <Image src="/logo.jpg" alt="Carpet Cleaners Supply" width={1200} height={308} style={{ width: "auto", height: 22 }} priority />
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
                <span>
                  {session.user.name} ({isOwnerManager(session) ? "Owner/Manager" : "Staff"})
                </span>
                <Link href="/account" className="hover:underline" style={{ color: "#fff" }}>My Account</Link>
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="font-medium"
                    style={{ color: "#fff", cursor: "pointer" }}
                  >
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
