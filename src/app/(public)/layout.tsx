import { PublicLayout } from "@/components/layouts/public-layout";

export default function PublicRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
