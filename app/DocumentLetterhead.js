import Image from "next/image";
import { COMPANY } from "@/lib/company";

export default function DocumentLetterhead() {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <Image src="/logo.jpg" alt={COMPANY.name} width={1200} height={308} style={{ width: "auto", height: 42 }} />
      <div style={{ fontSize: "0.75rem", color: "var(--faint)", marginTop: 6 }}>{COMPANY.address}</div>
      <div style={{ fontSize: "0.75rem", color: "var(--faint)" }}>{COMPANY.cityStateZip}</div>
      <div style={{ fontSize: "0.75rem", color: "var(--faint)", marginTop: 4 }}>{COMPANY.phone}</div>
      <div style={{ fontSize: "0.75rem", color: "var(--faint)" }}>{COMPANY.email}</div>
    </div>
  );
}
