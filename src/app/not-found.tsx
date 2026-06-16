import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Page Not Found | TIX.PH",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <p className="text-7xl font-bold text-muted-foreground">404</p>
          <CardTitle className="mt-4 text-2xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
