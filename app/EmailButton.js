"use client";

export default function EmailButton({ mailtoUrl, label = "Email" }) {
  return (
    <button type="button" onClick={() => { window.location.href = mailtoUrl; }} style={{ cursor: "pointer" }}>
      {label}
    </button>
  );
}
