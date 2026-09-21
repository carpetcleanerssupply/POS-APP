"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/invoices/new", label: "New Invoice" },
  { href: "/invoices", label: "Invoice Register" },
  { href: "/estimates", label: "Estimates" },
  { href: "/customers", label: "Customers" },
  { href: "/vendors", label: "Vendors" },
  { href: "/purchase-orders", label: "Purchase Orders" },
  { href: "/items", label: "Items" },
  { href: "/payments", label: "Payments Register" },
  { href: "/returns", label: "Returns" },
  { href: "/reports/sales", label: "Sales Report", ownerOnly: true },
  { href: "/reports/ar-aging", label: "A/R Aging", ownerOnly: true },
  { href: "/reports/inventory-valuation", label: "Inventory Valuation", ownerOnly: true },
  { href: "/admin", label: "Admin", ownerOnly: true },
];

export default function NavBar({ tierOwner }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.ownerOnly || tierOwner);

  const activeHref = items.reduce((best, item) => {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (!matches) return best;
    if (!best || item.href.length > best.length) return item.href;
    return best;
  }, null);

  return (
    <nav
      className="no-print flex gap-1 px-4 md:px-6 pt-2 border-b hairline overflow-x-auto"
      style={{ backgroundColor: "var(--panel)" }}
    >
      {items.map((item) => {
        const isActive = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-2.5 text-sm font-semibold whitespace-nowrap rounded-t-md"
            style={{
              backgroundColor: isActive ? "var(--paper)" : "transparent",
              color: isActive ? "var(--deep)" : "var(--faint)",
              borderBottom: isActive ? "2px solid var(--deep)" : "2px solid transparent",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
