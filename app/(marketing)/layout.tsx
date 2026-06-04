import { MarketingHeader } from "@/components/layout/marketing-header";
import { MarketingMobileNav } from "@/components/layout/marketing-mobile-nav";
import { Footer } from "@/components/footer";
import { QueryProvider } from "@/components/providers/query-provider";
import { StoreToaster } from "@/components/store/store-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <TooltipProvider delayDuration={200}>
        <div className="flex min-h-full flex-col pb-16 lg:pb-0">
          <MarketingHeader />
          {children}
          <Footer />
          <MarketingMobileNav />
          <StoreToaster />
        </div>
      </TooltipProvider>
    </QueryProvider>
  );
}
