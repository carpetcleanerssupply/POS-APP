export function displayName(customer) {
  if (customer.company) return customer.company;
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  return name || "(unnamed customer)";
}

// Freezes the customer's current address onto an invoice/estimate at the
// moment it's created, so a later address edit never rewrites history.
export function addressSnapshots(customer) {
  return {
    customerBillingSnapshot: {
      street: customer.billingStreet,
      street2: customer.billingStreet2,
      city: customer.billingCity,
      state: customer.billingState,
      zip: customer.billingZip,
    },
    customerShippingSnapshot: {
      street: customer.shippingStreet,
      street2: customer.shippingStreet2,
      city: customer.shippingCity,
      state: customer.shippingState,
      zip: customer.shippingZip,
    },
  };
}

export function formatAddress(snapshot) {
  if (!snapshot || !snapshot.street) return "";
  const cityStateZip = [snapshot.city, snapshot.state].filter(Boolean).join(", ");
  return [snapshot.street, snapshot.street2, [cityStateZip, snapshot.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" · ");
}

export function parseCustomerForm(form) {
  const str = (key) => form.get(key)?.toString().trim() || "";
  const optStr = (key) => str(key) || null;
  const bool = (key) => form.get(key) === "on";

  const shipSameAsBilling = bool("shipSameAsBilling");

  return {
    company: optStr("company"),
    firstName: optStr("firstName"),
    lastName: optStr("lastName"),
    workPhone: optStr("workPhone"),
    cellPhone: optStr("cellPhone"),
    email: optStr("email"),
    email2: optStr("email2"),
    unsubscribed: bool("unsubscribed"),
    webCustomer: bool("webCustomer"),

    billingStreet: optStr("billingStreet"),
    billingStreet2: optStr("billingStreet2"),
    billingCity: optStr("billingCity"),
    billingState: optStr("billingState"),
    billingZip: optStr("billingZip"),

    shipSameAsBilling,
    shippingStreet: shipSameAsBilling ? optStr("billingStreet") : optStr("shippingStreet"),
    shippingStreet2: shipSameAsBilling ? optStr("billingStreet2") : optStr("shippingStreet2"),
    shippingCity: shipSameAsBilling ? optStr("billingCity") : optStr("shippingCity"),
    shippingState: shipSameAsBilling ? optStr("billingState") : optStr("shippingState"),
    shippingZip: shipSameAsBilling ? optStr("billingZip") : optStr("shippingZip"),

    taxExempt: bool("taxExempt"),
    resaleCert: optStr("resaleCert"),
  };
}

export function isValidCustomer(data) {
  return Boolean(data.company || data.firstName || data.lastName);
}

export async function customerUsage(prisma, customer) {
  const [invoiceCount, estimateCount] = await Promise.all([
    prisma.invoice.count({ where: { customerId: customer.id } }),
    prisma.estimate.count({ where: { customerId: customer.id } }),
  ]);
  return {
    invoiceCount,
    estimateCount,
    hasBalance: Math.abs(Number(customer.balance)) > 0.005,
  };
}
