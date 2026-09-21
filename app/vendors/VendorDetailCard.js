"use client";

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

const inputClass = "w-full px-3 py-2 rounded border text-sm focus-amber hairline disabled:cursor-not-allowed";
function inputStyle(disabled) {
  return { backgroundColor: disabled ? "var(--paper)" : "var(--panel)", color: disabled ? "var(--faint)" : "var(--ink)" };
}

function formatAddress(a) {
  if (!a || !a.street) return "";
  const cityStateZip = [a.city, a.state].filter(Boolean).join(", ");
  return [a.street, a.street2, [cityStateZip, a.zip].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
}

export default function VendorDetailCard({ vendor, balanceDue, initialEditMode, error }) {
  const [editMode, setEditMode] = useState(Boolean(initialEditMode));
  const [draft, setDraft] = useState(vendor);

  function set(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function cancelEdit() {
    setDraft(vendor);
    setEditMode(false);
  }

  const address = formatAddress({
    street: vendor.addressStreet,
    street2: vendor.addressStreet2,
    city: vendor.addressCity,
    state: vendor.addressState,
    zip: vendor.addressZip,
  });

  return (
    <div className="card p-5">
      {error && ERROR_MESSAGES[error] && (
        <p className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>
          {ERROR_MESSAGES[error]}
        </p>
      )}

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="text-lg font-semibold" style={{ color: "var(--deep)" }}>{vendor.name || "Unnamed Vendor"}</div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button type="button" onClick={cancelEdit} className="btn btn-sm">Cancel</button>
              <button type="submit" form="vendor-edit-form" className="btn btn-sm btn-primary">Save</button>
            </>
          ) : (
            <button type="button" onClick={() => setEditMode(true)} className="btn btn-sm btn-primary">Edit</button>
          )}
          <form
            action={`/api/vendors/${vendor.id}/delete`}
            method="POST"
            onSubmit={(e) => {
              if (!confirm(`Delete "${vendor.name}"? This can't be undone.`)) e.preventDefault();
            }}
          >
            <button type="submit" className="text-sm font-medium" style={{ color: "var(--rust)", cursor: "pointer" }}>Delete</button>
          </form>
        </div>
      </div>

      {editMode ? (
        <form id="vendor-edit-form" action={`/api/vendors/${vendor.id}`} method="POST" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Vendor Name">
              <input name="name" value={draft.name || ""} onChange={(e) => set("name", e.target.value)} className={inputClass} style={inputStyle(false)} />
            </Field>
            <Field label="Contact Name">
              <input name="contactName" value={draft.contactName || ""} onChange={(e) => set("contactName", e.target.value)} className={inputClass} style={inputStyle(false)} />
            </Field>
            <Field label="Phone">
              <input name="phone" value={draft.phone || ""} onChange={(e) => set("phone", e.target.value)} className={inputClass} style={inputStyle(false)} />
            </Field>
            <div />
            <Field label="Email">
              <input name="email" type="email" value={draft.email || ""} onChange={(e) => set("email", e.target.value)} className={inputClass} style={inputStyle(false)} />
            </Field>
            <Field label="Secondary Email">
              <input name="email2" type="email" value={draft.email2 || ""} onChange={(e) => set("email2", e.target.value)} placeholder="optional" className={inputClass} style={inputStyle(false)} />
            </Field>
          </div>

          <Field label="Address">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input name="addressStreet" value={draft.addressStreet || ""} onChange={(e) => set("addressStreet", e.target.value)} placeholder="Street address" className={inputClass} style={inputStyle(false)} />
              </div>
              <div className="col-span-2">
                <input name="addressStreet2" value={draft.addressStreet2 || ""} onChange={(e) => set("addressStreet2", e.target.value)} placeholder="Apt, suite, unit (optional)" className={inputClass} style={inputStyle(false)} />
              </div>
              <input name="addressCity" value={draft.addressCity || ""} onChange={(e) => set("addressCity", e.target.value)} placeholder="City" className={inputClass} style={inputStyle(false)} />
              <div className="grid grid-cols-2 gap-2">
                <select name="addressState" value={draft.addressState || ""} onChange={(e) => set("addressState", e.target.value)} className={inputClass} style={inputStyle(false)}>
                  <option value="">State</option>
                  {US_STATES.map(([code, name]) => (
                    <option key={code} value={code}>{code} — {name}</option>
                  ))}
                </select>
                <input name="addressZip" value={draft.addressZip || ""} onChange={(e) => set("addressZip", e.target.value)} placeholder="ZIP" className={inputClass} style={inputStyle(false)} />
              </div>
            </div>
          </Field>

          <Field label="Notes">
            <textarea
              name="notes"
              value={draft.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="e.g. ordering minimums, lead times, account rep…"
              className={inputClass}
              style={inputStyle(false)}
            />
          </Field>
        </form>
      ) : (
        <div className="text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1" style={{ color: "var(--faint)" }}>
              {vendor.contactName && <div>{vendor.contactName}</div>}
              {vendor.phone && <div>{vendor.phone}</div>}
              {vendor.email && <div>{vendor.email}</div>}
              {vendor.email2 && <div>{vendor.email2}</div>}
              {!vendor.contactName && !vendor.phone && !vendor.email && !vendor.email2 && <div>No contact info on file.</div>}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Address</div>
              <div>{address || "—"}</div>
            </div>
            {vendor.notes && (
              <div>
                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Notes</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{vendor.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t hairline flex items-center justify-between">
        <span className="text-sm" style={{ color: "var(--faint)" }}>Balance Due</span>
        <span className="mono text-lg font-semibold" style={{ color: balanceDue > 0.005 ? "var(--rust)" : "var(--moss)" }}>
          ${balanceDue.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
