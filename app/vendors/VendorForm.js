"use client";

import Link from "next/link";
import { useState } from "react";
import { US_STATES } from "@/lib/us-states";

const ERROR_MESSAGES = {
  required: "Enter a vendor name.",
  duplicate_name: "A vendor with that name already exists.",
};

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>{label}</div>
      {children}
    </div>
  );
}

const inputClass = "w-full px-3 py-2 rounded border text-sm focus-amber hairline";
const inputStyle = { backgroundColor: "var(--panel)", color: "var(--ink)" };

const BLANK = { name: "", contactName: "", phone: "", email: "", email2: "", addressStreet: "", addressStreet2: "", addressCity: "", addressState: "", addressZip: "", notes: "" };

export default function VendorForm({ action, error }) {
  const [draft, setDraft] = useState(BLANK);
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="card p-5" style={{ maxWidth: 640 }}>
      {error && ERROR_MESSAGES[error] && (
        <p className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>
          {ERROR_MESSAGES[error]}
        </p>
      )}

      <form action={action} method="POST" className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Vendor Name">
            <input name="name" value={draft.name} onChange={(e) => set("name", e.target.value)} required className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Contact Name">
            <input name="contactName" value={draft.contactName} onChange={(e) => set("contactName", e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Phone">
            <input name="phone" value={draft.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
          <div />
          <Field label="Email">
            <input name="email" type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Secondary Email">
            <input name="email2" type="email" value={draft.email2} onChange={(e) => set("email2", e.target.value)} placeholder="optional" className={inputClass} style={inputStyle} />
          </Field>
        </div>

        <Field label="Address">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <input name="addressStreet" value={draft.addressStreet} onChange={(e) => set("addressStreet", e.target.value)} placeholder="Street address" className={inputClass} style={inputStyle} />
            </div>
            <div className="col-span-2">
              <input name="addressStreet2" value={draft.addressStreet2} onChange={(e) => set("addressStreet2", e.target.value)} placeholder="Apt, suite, unit (optional)" className={inputClass} style={inputStyle} />
            </div>
            <input name="addressCity" value={draft.addressCity} onChange={(e) => set("addressCity", e.target.value)} placeholder="City" className={inputClass} style={inputStyle} />
            <div className="grid grid-cols-2 gap-2">
              <select name="addressState" value={draft.addressState} onChange={(e) => set("addressState", e.target.value)} className={inputClass} style={inputStyle}>
                <option value="">State</option>
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>{code} — {name}</option>
                ))}
              </select>
              <input name="addressZip" value={draft.addressZip} onChange={(e) => set("addressZip", e.target.value)} placeholder="ZIP" className={inputClass} style={inputStyle} />
            </div>
          </div>
        </Field>

        <Field label="Notes">
          <textarea
            name="notes"
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="e.g. ordering minimums, lead times, account rep…"
            className={inputClass}
            style={inputStyle}
          />
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn btn-primary">Add Vendor</button>
          <Link href="/vendors" className="btn">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
