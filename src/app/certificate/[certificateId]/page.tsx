"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils/format";
import { Printer, GraduationCap } from "lucide-react";

export default function CertificatePage() {
  const params = useParams();
  const certificateId = params.certificateId as Id<"certificates">;
  const cert = useQuery(api.certificates.getPublic, { certificateId });

  if (cert === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Skeleton className="h-[480px] w-full max-w-3xl" />
      </div>
    );
  }

  if (cert === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-2xl font-bold">Certificate not found</h1>
        <p className="text-muted-foreground">
          This certificate may have been revoked or the link is incorrect.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 py-10 px-4 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl">
        {/* Action bar — hidden when printing */}
        <div className="mb-4 flex items-center justify-end print:hidden">
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>

        {/* The certificate */}
        <div className="relative overflow-hidden rounded-xl border-4 border-double border-amber-700/60 bg-white p-10 text-center shadow-sm print:border-amber-700 print:shadow-none sm:p-16">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <GraduationCap className="h-7 w-7" />
          </div>

          <p className="text-sm uppercase tracking-[0.3em] text-amber-800">
            Certificate of Completion
          </p>

          <p className="mt-10 text-sm text-muted-foreground">This certifies that</p>
          <h1 className="mt-2 font-serif text-4xl font-bold text-gray-900 sm:text-5xl">
            {cert.attendeeName}
          </h1>

          <p className="mt-8 text-sm text-muted-foreground">
            has successfully completed
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900">
            {cert.eventTitle}
          </h2>

          <p className="mt-8 text-sm text-gray-700">
            Completed on {formatDate(cert.completionDate)}
          </p>

          <div className="mt-12 flex items-end justify-between text-left">
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                {cert.certNumber}
              </p>
              <p className="text-xs text-muted-foreground">Verification number</p>
            </div>
            <div className="text-right">
              <p className="border-t border-gray-400 pt-1 text-xs text-muted-foreground">
                Issued via TIX.PH · {formatDate(cert.issuedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
