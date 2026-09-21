import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export default async function EditVendorRedirect({ params }) {
  await requireSession();
  const { id } = await params;
  redirect(`/vendors?selected=${id}&edit=1`);
}
