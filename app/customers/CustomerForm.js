const ERROR_MESSAGES = {
  required: "Enter a company name or a contact name.",
};

const fieldStyle = { display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" };
const rowStyle = { display: "flex", gap: "1rem" };
const labelStyle = { flex: 1, fontSize: "0.9rem" };
const sectionStyle = { marginTop: "1.5rem", marginBottom: "0.5rem", fontSize: "1rem", fontWeight: 600 };

export default function CustomerForm({ action, customer, error, saved, submitLabel }) {
  const v = (key, fallback = "") => customer?.[key] ?? fallback;

  return (
    <div style={{ maxWidth: 640 }}>
      {error && ERROR_MESSAGES[error] && (
        <p style={{ color: "#c62828", background: "#ffebee", padding: "0.75rem 1rem", borderRadius: 8 }}>
          {ERROR_MESSAGES[error]}
        </p>
      )}
      {saved && (
        <p style={{ color: "#2e7d32", background: "#e8f5e9", padding: "0.75rem 1rem", borderRadius: 8 }}>
          Customer saved.
        </p>
      )}

      {customer && (
        <p style={{ color: "#555" }}>
          Balance: <strong>${Number(customer.balance).toFixed(2)}</strong>{" "}
          <a href={`/payments/new?customerId=${customer.id}`}>Record Payment</a>
        </p>
      )}

      <form action={action} method="POST" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <div style={rowStyle}>
          <label style={labelStyle}>
            Company
            <input name="company" defaultValue={v("company")} style={fieldStyle} />
          </label>
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>
            First Name
            <input name="firstName" defaultValue={v("firstName")} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Last Name
            <input name="lastName" defaultValue={v("lastName")} style={fieldStyle} />
          </label>
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>
            Work Phone
            <input name="workPhone" defaultValue={v("workPhone")} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Cell Phone
            <input name="cellPhone" defaultValue={v("cellPhone")} style={fieldStyle} />
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
        <label>
          <input type="checkbox" name="unsubscribed" defaultChecked={v("unsubscribed", false)} /> Unsubscribed from
          email
        </label>

        <div style={sectionStyle}>Billing Address</div>
        <label>
          Street
          <input name="billingStreet" defaultValue={v("billingStreet")} style={fieldStyle} />
        </label>
        <label>
          Street 2
          <input name="billingStreet2" defaultValue={v("billingStreet2")} style={fieldStyle} />
        </label>
        <div style={rowStyle}>
          <label style={labelStyle}>
            City
            <input name="billingCity" defaultValue={v("billingCity")} style={fieldStyle} />
          </label>
          <label style={{ ...labelStyle, flex: 0.5 }}>
            State
            <input name="billingState" defaultValue={v("billingState")} style={fieldStyle} />
          </label>
          <label style={{ ...labelStyle, flex: 0.5 }}>
            Zip
            <input name="billingZip" defaultValue={v("billingZip")} style={fieldStyle} />
          </label>
        </div>

        <div style={sectionStyle}>Shipping Address</div>
        <label>
          <input type="checkbox" name="shipSameAsBilling" defaultChecked={v("shipSameAsBilling", true)} /> Same as
          billing address
        </label>
        <label>
          Street
          <input name="shippingStreet" defaultValue={v("shippingStreet")} style={fieldStyle} />
        </label>
        <label>
          Street 2
          <input name="shippingStreet2" defaultValue={v("shippingStreet2")} style={fieldStyle} />
        </label>
        <div style={rowStyle}>
          <label style={labelStyle}>
            City
            <input name="shippingCity" defaultValue={v("shippingCity")} style={fieldStyle} />
          </label>
          <label style={{ ...labelStyle, flex: 0.5 }}>
            State
            <input name="shippingState" defaultValue={v("shippingState")} style={fieldStyle} />
          </label>
          <label style={{ ...labelStyle, flex: 0.5 }}>
            Zip
            <input name="shippingZip" defaultValue={v("shippingZip")} style={fieldStyle} />
          </label>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#777", marginTop: "-0.5rem" }}>
          If "Same as billing address" is checked, the shipping fields above are ignored and the billing address is
          used instead.
        </p>

        <div style={sectionStyle}>Tax</div>
        <label>
          <input type="checkbox" name="taxExempt" defaultChecked={v("taxExempt", false)} /> Tax exempt
        </label>
        <label>
          Resale Certificate #
          <input name="resaleCert" defaultValue={v("resaleCert")} style={fieldStyle} />
        </label>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button type="submit" style={{ padding: "0.6rem 1.2rem", cursor: "pointer" }}>
            {submitLabel}
          </button>
          <a href="/customers" style={{ padding: "0.6rem 1.2rem", alignSelf: "center" }}>
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
