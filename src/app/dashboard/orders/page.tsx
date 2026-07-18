import { redirect } from "next/navigation";

export default function CustomerOrdersRedirectPage() {
  redirect("/dashboard/pedidos");
}
