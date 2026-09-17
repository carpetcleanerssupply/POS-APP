const ERROR_MESSAGES = {
  required: "Enter a vendor name.",
  duplicate_name: "A vendor with that name already exists.",
};

const fieldStyle = { display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" };
const rowStyle = { display: "flex", gap: "1rem" };
const labelStyle = { flex: 1, fontSize: "0.9rem" };
const sectionStyle = { marginTop: "1.5rem", marginBottom: "0.5rem", fontSize: "1rem", fontWeight: 600 };

export default function VendorForm({ action, vendor, error, submitLabel }) {
  const v = (key, fallback = "") => vendor?.[key] ?? fallback;

  return (
    <div style={{ maxWidth: 560 }}>
      {error && ERROR_MESSAGES[error] && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>
          {ERROR_MESSAGES[error]}
        </p>
      )}

      <form action={action} method="POST" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <label>
          Vendor Name *
          <input name="name" defaultValue={v("name")} required style={fieldStyle} />
        </label>
        <div style={rowStyle}>
          <label style={labelStyle}>
            Contact Name
            <input name="contactName" defaultValue={v("contactName")} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Phone
            <input name="phone" defaultValue={v("phone")} style={fieldStyle} />
          </label>
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>
            Email
            <input name="email" type="email" defaultValue={v("email")} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Email 2
            <input name="email2" type="email" defaultValue={v("email2")} style={fieldStyle} />
          </label>
        </div>

        <div style={sectionStyle}>Address</div>
        <label>
          Street
          <input name="addressStreet" defaultValue={v("addressStreet")} style={fieldStyle} />
        </label>
        <label>
          Street 2
          <input name="addressStreet2" defaultValue={v("addressStreet2")} style={fieldStyle} />
        </label>
        <div style={rowStyle}>
          <label style={labelStyle}>
            City
            <input name="addressCity" defaultValue={v("addressCity")} style={fieldStyle} />
          </label>
          <label style={{ ...labelStyle, flex: 0.5 }}>
            State
            <input name="addressState" defaultValue={v("addressState")} style={fieldStyle} />
          </label>
          <label style={{ ...labelStyle, flex: 0.5 }}>
            Zip
            <input name="addressZip" defaultValue={v("addressZip")} style={fieldStyle} />
          </label>
        </div>

        <label>
          Notes
          <textarea name="notes" defaultValue={v("notes")} style={{ ...fieldStyle, minHeight: 60 }} />
        </label>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button type="submit" style={{ padding: "0.6rem 1.2rem", cursor: "pointer" }}>
            {submitLabel}
          </button>
          <a href="/vendors" style={{ padding: "0.6rem 1.2rem", alignSelf: "center" }}>
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
