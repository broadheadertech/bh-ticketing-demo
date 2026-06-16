import { redirect } from "next/navigation";

// The dashboard home is the back office (the unified role-switching console).
export default function DashboardPage() {
  redirect("/backoffice");
}
