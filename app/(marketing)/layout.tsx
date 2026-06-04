import { MarketingHeader } from "@/components/layout/marketing-header";
import { Footer } from "@/components/footer";
import { StoreToaster } from "@/components/store/store-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-full flex-col">
        <MarketingHeader />
        {children}
        <Footer />
        <StoreToaster />
      </div>
    </TooltipProvider>
  );
}
