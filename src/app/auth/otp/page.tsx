import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthOtpForm } from "@/components/auth/auth-otp-form";
import { AuthOtpShell } from "@/components/auth/auth-otp-shell";
import { authOtpCopy, isAuthOtpType } from "@/lib/auth/otp";

export const metadata: Metadata = {
  title: "Código de verificación",
};

type OtpPageProps = {
  searchParams: Promise<{
    email?: string;
    otp?: string;
    type?: string;
    from?: string;
  }>;
};

export default async function OtpPage({ searchParams }: OtpPageProps) {
  const params = await searchParams;
  const email = params.email?.trim().toLowerCase() ?? "";
  const type = isAuthOtpType(params.type) ? params.type : null;
  const from =
    params.from === "login" || params.from === "register"
      ? params.from
      : undefined;
  const initialOtp = params.otp?.replace(/\D/g, "").slice(0, 6) ?? "";

  if (!email || !type) {
    redirect("/auth/login");
  }

  const copy = authOtpCopy(type);

  return (
    <AuthOtpShell
      title={copy.title}
      description={
        <>
          {copy.description}{" "}
          <span className="font-medium text-foreground">{email}</span>
        </>
      }
    >
      <AuthOtpForm
        email={email}
        type={type}
        initialOtp={initialOtp}
        from={from}
      />
    </AuthOtpShell>
  );
}
