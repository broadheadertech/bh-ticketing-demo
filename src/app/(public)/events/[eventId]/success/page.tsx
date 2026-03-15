import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PurchaseSuccessPage() {
  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center space-y-6">
      <div className="text-5xl" aria-hidden="true">
        🎉
      </div>
      <h1 className="text-2xl font-bold">Payment successful!</h1>
      <p className="text-muted-foreground">
        Your tickets will be emailed to you shortly. Check your inbox in a few
        minutes.
      </p>
      <div className="flex gap-4 justify-center">
        <Button asChild variant="outline">
          <Link href="/events">Browse more events</Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
