import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s · Nicodigos",
    default: "Cuenta · Nicodigos",
  },
  description:
    "Accede a tu cuenta de Nicodigos para comprar y gestionar productos digitales.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      {children}
    </div>
  );
}
