import type React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
}

export function MetricCard({ icon, label, value, subtitle }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-muted-foreground">{icon}</div>
        <p className="text-sm text-muted-foreground mt-2">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
