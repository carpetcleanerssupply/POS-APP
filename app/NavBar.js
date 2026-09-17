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
  { href: "/reports/ar-aging", label: "A/R Aging", ownerOnly: true },
  { href: "/reports/inventory-valuation", label: "Inventory Valuation", ownerOnly: true },
  { href: "/admin", label: "Admin", ownerOnly: true },
];

const tabStyle = {
  padding: "0.5rem 0.8rem",
  borderRadius: 6,
  fontSize: "0.9rem",
  whiteSpace: "nowrap",
};

const activeTabStyle = {
  ...tabStyle,
  background: "#1a1a1a",
  color: "#fff",
};

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
      className="no-print"
      style={{
        display: "flex",
        gap: "0.35rem",
        flexWrap: "nowrap",
        overflowX: "auto",
        padding: "0.5rem 1rem",
      }}
    >
      {items.map((item) => (
        <Link key={item.href} href={item.href} style={item.href === activeHref ? activeTabStyle : tabStyle}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
