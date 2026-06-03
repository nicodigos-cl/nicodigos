import { MarketingHeader } from "@/components/layout/marketing-header";
import { Footer } from "@/components/footer";
import { StoreToaster } from "@/components/store/store-toaster";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingHeader />
      {children}
      <Footer />
      <StoreToaster />
    </div>
  );
}
