"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { RoleSwitcher } from "@/components/custom/role-switcher";
import { SidebarNav } from "@/components/custom/sidebar-nav";
import { RequestRoleButton } from "@/components/custom/request-role-button";
import { NotificationBell } from "@/components/custom/notification-bell";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 border-r bg-background md:flex md:flex-col">
        <div className="p-6">
          <span className="text-xl font-bold">PHLive</span>
        </div>
        <div className="px-4 pb-3">
          <RoleSwitcher />
        </div>
        <div className="flex-1">
          <SidebarNav />
        </div>
        <div className="border-t px-4 py-3">
          <RequestRoleButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="flex items-center gap-4 border-b bg-background px-6 py-4">
          {/* Mobile hamburger */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="p-6 pb-3">
                <SheetTitle className="text-xl font-bold">PHLive</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-3">
                <RoleSwitcher />
              </div>
              <SidebarNav />
              <div className="border-t px-4 py-3 mt-auto">
                <RequestRoleButton />
              </div>
            </SheetContent>
          </Sheet>
          <span className="text-lg font-semibold md:hidden">PHLive</span>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
