import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buildAuthOtpPath } from "@/lib/auth/otp";

export const metadata: Metadata = {
  title: "Revisa tu correo",
};

type CheckEmailPageProps = {
  searchParams: Promise<{
    email?: string;
    type?: string;
  }>;
};

export default async function CheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const params = await searchParams;
  const email = params.email?.trim().toLowerCase() ?? "";

  if (!email) {
    redirect("/auth/login");
  }

  const type =
    params.type === "reset" ? "forget-password" : "email-verification";
  const from = type === "email-verification" ? "register" : "login";

  redirect(buildAuthOtpPath({ email, type, from }));
}
