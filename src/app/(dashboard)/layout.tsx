import { DashboardLayout } from "@/components/layouts/dashboard-layout";

export default function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
