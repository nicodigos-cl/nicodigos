import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { buildAuthOtpPath } from "@/lib/auth/otp";

export const metadata: Metadata = {
  title: "Nueva contraseña",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{
    email?: string;
    otp?: string;
    token?: string;
    error?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const email = params.email?.trim().toLowerCase() ?? "";

  if (email) {
    redirect(
      buildAuthOtpPath({
        email,
        otp: params.otp,
        type: "forget-password",
        from: "login",
      }),
    );
  }

  redirect("/auth/forgot-password");
}
