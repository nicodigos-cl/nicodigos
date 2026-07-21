import { ThemeProvider } from "@/components/theme-provider";
import { ConfirmDialogHost } from "@/components/confirm-dialog";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import QueryClientProvider from "@/providers/query-client-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider>
        <TooltipProvider>
          {children}
          <ConfirmDialogHost />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
