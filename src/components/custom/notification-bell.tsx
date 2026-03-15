"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getNotificationHref(
  entityType?: string,
  entityId?: string
): string | null {
  if (!entityType || !entityId) return null;
  if (entityType === "event") return `/events/${entityId}`;
  if (entityType === "venue") return `/venues/${entityId}`;
  if (entityType === "creator") return `/events?creator=${entityId}`;
  return null;
}

export function NotificationBell() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    currentUser ? {} : "skip"
  );
  const notifications = useQuery(
    api.notifications.getMyNotifications,
    currentUser && open ? {} : "skip"
  );
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const [isPending, setIsPending] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!currentUser) return null;

  async function handleMarkAllRead() {
    setIsPending(true);
    try {
      await markAllAsRead();
    } finally {
      setIsPending(false);
    }
  }

  async function handleNotificationClick(notification: {
    _id: string;
    read: boolean;
    entityType?: string;
    entityId?: string;
  }) {
    if (!notification.read) {
      await markAsRead({ notificationId: notification._id as never });
    }
    const href = getNotificationHref(
      notification.entityType,
      notification.entityId
    );
    if (href) {
      setOpen(false);
      router.push(href);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount !== undefined && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount !== undefined && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleMarkAllRead}
              disabled={isPending}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications === undefined ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => {
              const href = getNotificationHref(n.entityType, n.entityId);
              return (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-muted transition-colors",
                    !n.read && "bg-blue-50 dark:bg-blue-950/20"
                  )}
                >
                  <p className="text-sm font-medium leading-tight">
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {timeAgo(n.createdAt)}
                    {href && (
                      <span className="ml-1 text-primary">View &rarr;</span>
                    )}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
