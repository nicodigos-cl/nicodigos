import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-14" />{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>; }
