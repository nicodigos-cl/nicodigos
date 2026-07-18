import { getSession } from "@/lib/auth/session";
import { AUTH_HOME_PATH } from "@/lib/auth/otp";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: {
    template: "%s · Nicodigos",
    default: "Cuenta · Nicodigos",
  },
  description:
    "Accede a tu cuenta de Nicodigos para comprar y gestionar productos digitales.",
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const session = await getSession();
  if (session && session.user) {
    redirect(AUTH_HOME_PATH);
  }
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      {children}
    </div>
  );
}
