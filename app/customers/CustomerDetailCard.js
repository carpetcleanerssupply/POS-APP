"use client";

import { useState } from "react";
import { contactName, displayName, formatAddress } from "@/lib/customers";
import { US_STATES } from "@/lib/us-states";

const ERROR_MESSAGES = {
  required: "Enter a company name or a contact name.",
};

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>{label}</div>
      {children}
    </div>
  );
}

function Badge({ children, tone = "faint" }) {
  const bg = { faint: "#EDEAE1", moss: "var(--moss-bg)", rust: "var(--rust-bg)", amber: "#FBF0DA" }[tone];
  const fg = { faint: "var(--faint)", moss: "var(--moss)", rust: "var(--rust)", amber: "var(--amber-dark)" }[tone];
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: bg, color: fg, letterSpacing: "0.02em" }}>
      {children}
    </span>
  );
}

const inputClass = "w-full px-3 py-2 rounded border text-sm focus-amber hairline disabled:cursor-not-allowed";
function inputStyle(disabled) {
  return { backgroundColor: disabled ? "var(--paper)" : "var(--panel)", color: disabled ? "var(--faint)" : "var(--ink)" };
}

function AddressFields({ prefix, draft, onChange, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2">
        <input
          name={`${prefix}Street`}
          value={draft[`${prefix}Street`] || ""}
          onChange={(e) => onChange(`${prefix}Street`, e.target.value)}
          disabled={disabled}
          placeholder="Street address"
          className={inputClass}
          style={inputStyle(disabled)}
        />
      </div>
      <div className="col-span-2">
        <input
          name={`${prefix}Street2`}
          value={draft[`${prefix}Street2`] || ""}
          onChange={(e) => onChange(`${prefix}Street2`, e.target.value)}
          disabled={disabled}
          placeholder="Apt, suite, unit (optional)"
          className={inputClass}
          style={inputStyle(disabled)}
        />
      </div>
      <input
        name={`${prefix}City`}
        value={draft[`${prefix}City`] || ""}
        onChange={(e) => onChange(`${prefix}City`, e.target.value)}
        disabled={disabled}
        placeholder="City"
        className={inputClass}
        style={inputStyle(disabled)}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          name={`${prefix}State`}
          value={draft[`${prefix}State`] || ""}
          onChange={(e) => onChange(`${prefix}State`, e.target.value)}
          disabled={disabled}
          className={inputClass}
          style={inputStyle(disabled)}
        >
          <option value="">State</option>
          {US_STATES.map(([code, name]) => (
            <option key={code} value={code}>{code} — {name}</option>
          ))}
        </select>
        <input
          name={`${prefix}Zip`}
          value={draft[`${prefix}Zip`] || ""}
          onChange={(e) => onChange(`${prefix}Zip`, e.target.value)}
          disabled={disabled}
          placeholder="ZIP"
          className={inputClass}
          style={inputStyle(disabled)}
        />
      </div>
    </div>
  );
}

export default function CustomerDetailCard({ customer, initialEditMode, error }) {
  const [editMode, setEditMode] = useState(Boolean(initialEditMode));
  const [draft, setDraft] = useState(customer);

  function set(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function cancelEdit() {
    setDraft(customer);
    setEditMode(false);
  }

  const billingAddr = formatAddress({
    street: customer.billingStreet,
    street2: customer.billingStreet2,
    city: customer.billingCity,
    state: customer.billingState,
    zip: customer.billingZip,
  });
  const shippingAddr = formatAddress({
    street: customer.shippingStreet,
    street2: customer.shippingStreet2,
    city: customer.shippingCity,
    state: customer.shippingState,
    zip: customer.shippingZip,
  });

  return (
    <div className="card p-5">
      {error && ERROR_MESSAGES[error] && (
        <p className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ color: "var(--rust)", backgroundColor: "var(--rust-bg)" }}>
          {ERROR_MESSAGES[error]}
        </p>
      )}

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="text-lg font-semibold" style={{ color: "var(--deep)" }}>{displayName(customer)}</div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button type="button" onClick={cancelEdit} className="btn btn-sm">Cancel</button>
              <button type="submit" form="customer-edit-form" className="btn btn-sm btn-primary">Save</button>
            </>
          ) : (
            <button type="button" onClick={() => setEditMode(true)} className="btn btn-sm btn-primary">Edit</button>
          )}
          <form
            action={`/api/customers/${customer.id}/delete`}
            method="POST"
            onSubmit={(e) => {
              if (!confirm(`Delete "${displayName(customer)}"? This can't be undone.`)) e.preventDefault();
            }}
          >
            <button type="submit" className="text-sm font-medium" style={{ color: "var(--rust)", cursor: "pointer" }}>Delete</button>
          </form>
        </div>
      </div>

      {editMode ? (
        <form id="customer-edit-form" action={`/api/customers/${customer.id}`} method="POST" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Company">
              <input name="company" value={draft.company || ""} onChange={(e) => set("company", e.target.value)} className={inputClass} style={inputStyle(false)} />
            </Field>
            <Field label="Web Customer">
              <label className="flex items-center gap-2 text-sm py-2">
                <input type="checkbox" name="webCustomer" checked={Boolean(draft.webCustomer)} onChange={(e) => set("webCustomer", e.target.checked)} />
                Web customer
              </label>
            </Field>
            <Field label="First Name">
              <input name="firstName" value={draft.firstName || ""} onChange={(e) => set("firstName", e.target.value)} className={inputClass} style={inputStyle(false)} />
            </Field>
            <Field label="Last Name">
              <input name="lastName" value={draft.lastName || ""} onChange={(e) => set("lastName", e.target.value)} className={inputClass} style={inputStyle(false)} />
            </Field>
            <Field label="Email">
              <div className="flex items-center gap-2">
                <input name="email" type="email" value={draft.email || ""} onChange={(e) => set("email", e.target.value)} className={inputClass} style={inputStyle(false)} />
                <label className="flex items-center gap-1 text-xs whitespace-nowrap flex-shrink-0" style={{ color: "var(--faint)" }}>
                  <input type="checkbox" name="unsubscribed" checked={Boolean(draft.unsubscribed)} onChange={(e) => set("unsubscribed", e.target.checked)} /> Unsubscribed
                </label>
              </div>
            </Field>
            <Field label="Secondary Email">
              <input name="email2" type="email" value={draft.email2 || ""} onChange={(e) => set("email2", e.target.value)} placeholder="optional" className={inputClass} style={inputStyle(false)} />
            </Field>
            <Field label="Work Phone">
              <input name="workPhone" value={draft.workPhone || ""} onChange={(e) => set("workPhone", e.target.value)} className={inputClass} style={inputStyle(false)} />
            </Field>
            <Field label="Cell Phone">
              <input name="cellPhone" value={draft.cellPhone || ""} onChange={(e) => set("cellPhone", e.target.value)} className={inputClass} style={inputStyle(false)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Billing Address">
              <AddressFields prefix="billing" draft={draft} onChange={set} disabled={false} />
            </Field>
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Shipping Address</div>
                <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--faint)" }}>
                  <input type="checkbox" name="shipSameAsBilling" checked={Boolean(draft.shipSameAsBilling)} onChange={(e) => set("shipSameAsBilling", e.target.checked)} /> Same as billing
                </label>
              </div>
              <AddressFields
                prefix="shipping"
                draft={draft.shipSameAsBilling ? {
                  shippingStreet: draft.billingStreet, shippingStreet2: draft.billingStreet2,
                  shippingCity: draft.billingCity, shippingState: draft.billingState, shippingZip: draft.billingZip,
                } : draft}
                onChange={set}
                disabled={Boolean(draft.shipSameAsBilling)}
              />
            </div>
          </div>

          <div className="pt-3 border-t hairline flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="taxExempt" checked={Boolean(draft.taxExempt)} onChange={(e) => set("taxExempt", e.target.checked)} />
              Tax-Exempt / Resale Customer
            </label>
            {draft.taxExempt && (
              <div className="flex items-center gap-2">
                <label className="text-xs uppercase tracking-wide" style={{ color: "var(--faint)" }}>Resale Cert #</label>
                <input name="resaleCert" value={draft.resaleCert || ""} onChange={(e) => set("resaleCert", e.target.value)} placeholder="certificate number" className={inputClass} style={{ ...inputStyle(false), width: 200 }} />
              </div>
            )}
          </div>
        </form>
      ) : (
        <div className="text-sm">
          {customer.company && contactName(customer) && <div className="font-medium text-base mb-3">{contactName(customer)}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1" style={{ color: "var(--faint)" }}>
              {customer.workPhone && <div>Work: {customer.workPhone}</div>}
              {customer.cellPhone && <div>Cell: {customer.cellPhone}</div>}
              {customer.email && <div>{customer.email}</div>}
              {customer.email2 && <div>{customer.email2}</div>}
              {!customer.workPhone && !customer.cellPhone && !customer.email && !customer.email2 && <div>No contact info on file.</div>}
              {customer.unsubscribed && <div style={{ color: "var(--rust)" }}>Unsubscribed from email list</div>}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Billing</div>
              <div>{billingAddr || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--faint)" }}>Shipping</div>
              <div>{customer.shipSameAsBilling ? "Same as billing" : (shippingAddr || "—")}</div>
            </div>
          </div>
          {(customer.taxExempt || customer.webCustomer) && (
            <div className="mt-4 flex gap-2">
              {customer.taxExempt && <Badge tone="amber">Tax-Exempt{customer.resaleCert ? ` — ${customer.resaleCert}` : ""}</Badge>}
              {customer.webCustomer && <Badge tone="faint">Web Customer</Badge>}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t hairline flex items-center justify-between">
        <span className="text-sm" style={{ color: "var(--faint)" }}>Current Balance</span>
        <span className="mono text-lg font-semibold" style={{ color: customer.balance > 0.005 ? "var(--rust)" : "var(--moss)" }}>
          ${customer.balance.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
