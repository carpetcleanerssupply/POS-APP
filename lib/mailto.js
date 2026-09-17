// This only opens the user's own email client with a prefilled draft — it
// never sends anything itself, matching the prototype's approach exactly.
// No email service/API key involved.
export function formatEmailRecipients(raw) {
  return (raw || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .join(",");
}

export function buildMailtoUrl({ to, subject, body }) {
  const recipients = formatEmailRecipients(to);
  return `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
