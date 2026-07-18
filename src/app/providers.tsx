import { TooltipProvider } from "@/components/ui/tooltip";
import QueryClientProvider from "@/providers/query-client-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
