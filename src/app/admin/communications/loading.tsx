import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <div className="space-y-5" aria-label="Cargando Comunicaciones"><Skeleton className="h-20 w-full" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div><Skeleton className="h-72 w-full" /></div>; }
