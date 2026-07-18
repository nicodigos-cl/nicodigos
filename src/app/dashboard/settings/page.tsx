import { redirect } from "next/navigation";

export default function CustomerSettingsRedirectPage() {
  redirect("/dashboard/profile");
}
