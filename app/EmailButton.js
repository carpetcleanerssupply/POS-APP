"use client";

export default function EmailButton({ mailtoUrl, label = "Email" }) {
  return (
    <button type="button" className="btn btn-sm" onClick={() => { window.location.href = mailtoUrl; }}>
      {label}
    </button>
  );
}
