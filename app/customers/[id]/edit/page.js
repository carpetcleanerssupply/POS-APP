import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";

export default async function EditCustomerRedirect({ params }) {
  await requireSession();
  const { id } = await params;
  redirect(`/customers?selected=${id}&edit=1`);
}
