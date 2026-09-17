export function paymentMethodLabel(method, checkNumber) {
  if (method === "CREDIT") return "Account Credit";
  if (method === "CHECK") return `Check${checkNumber ? ` #${checkNumber}` : ""}`;
  if (method === "CARD") return "Credit Card";
  if (method === "CASH") return "Cash";
  return method;
}
