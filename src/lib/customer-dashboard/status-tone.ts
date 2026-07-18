export type CustomerStatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export function toneToBadgeClass(tone: CustomerStatusTone): string {
  switch (tone) {
    case "success":
      return "bg-primary/10 text-primary border-transparent";
    case "info":
      return "bg-chart-2/15 text-chart-2 border-transparent";
    case "warning":
      return "bg-secondary text-secondary-foreground border-transparent";
    case "danger":
      return "bg-destructive/10 text-destructive border-transparent";
    case "neutral":
    default:
      return "bg-muted text-muted-foreground border-transparent";
  }
}
