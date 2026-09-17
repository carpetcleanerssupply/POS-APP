import { daysOverdue } from "@/lib/dashboard";

export async function buildArAging(prisma) {
  const accountInvoices = await prisma.invoice.findMany({ where: { status: "CLOSED", settledTo: "ACCOUNT" } });
  const openInvoices = accountInvoices.filter((inv) => Number(inv.total) - Number(inv.paidAmount) > 0.005);

  const byCustomer = {};
  for (const inv of openInvoices) {
    const owed = Number(inv.total) - Number(inv.paidAmount);
    const days = daysOverdue(inv.dueDate);
    const bucket = days <= 0 ? "current" : days <= 30 ? "d30" : days <= 60 ? "d60" : days <= 90 ? "d90" : "d90plus";
    if (!byCustomer[inv.customerId]) {
      byCustomer[inv.customerId] = {
        customerId: inv.customerId,
        customerName: inv.customerName,
        current: 0,
        d30: 0,
        d60: 0,
        d90: 0,
        d90plus: 0,
        total: 0,
      };
    }
    byCustomer[inv.customerId][bucket] += owed;
    byCustomer[inv.customerId].total += owed;
  }

  const rows = Object.values(byCustomer).sort((a, b) => b.total - a.total);
  const grand = rows.reduce(
    (acc, r) => ({
      current: acc.current + r.current,
      d30: acc.d30 + r.d30,
      d60: acc.d60 + r.d60,
      d90: acc.d90 + r.d90,
      d90plus: acc.d90plus + r.d90plus,
      total: acc.total + r.total,
    }),
    { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0, total: 0 }
  );

  return { rows, grand };
}
