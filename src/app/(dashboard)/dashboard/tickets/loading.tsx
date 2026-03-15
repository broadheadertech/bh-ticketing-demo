import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket } from "lucide-react";

export default function MyTicketsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Ticket className="h-6 w-6" />
        <h1 className="text-2xl font-bold">My Tickets</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-[200px]" />
              <Skeleton className="h-3 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
