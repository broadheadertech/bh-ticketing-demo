"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import Image from "next/image";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Users, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface VenuePickerProps {
  onSelect: (venueId: string, venueName: string) => void;
  selectedVenueId?: string;
  onClear: () => void;
}

export function VenuePicker({
  onSelect,
  selectedVenueId,
  onClear,
}: VenuePickerProps) {
  const [search, setSearch] = useState("");
  const venues = useQuery(api.venues.listPublicVenues);

  const filtered = useMemo(() => {
    if (!venues) return [];
    if (!search.trim()) return venues;
    const q = search.toLowerCase();
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q)
    );
  }, [venues, search]);

  if (venues === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-md bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No venues are currently listed on the platform.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search venues by name or location..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {selectedVenueId && (
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-green-600" />
          <span className="font-medium">
            Venue selected:{" "}
            {venues.find((v) => (v._id as string) === selectedVenueId)?.name}
          </span>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-2">
        {filtered.map((venue) => {
          const venueIdStr = venue._id as string;
          const isSelected = selectedVenueId === venueIdStr;
          return (
            <button
              key={venue._id}
              type="button"
              onClick={() => onSelect(venueIdStr, venue.name)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors hover:bg-muted",
                isSelected && "bg-primary/10 border border-primary"
              )}
            >
              <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                {venue.firstPhotoUrl ? (
                  <Image
                    src={venue.firstPhotoUrl}
                    alt={venue.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{venue.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{venue.location}</span>
                </p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0 gap-1">
                <Users className="h-3 w-3" />
                {venue.capacity.toLocaleString()}
              </Badge>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No venues match your search.
          </p>
        )}
      </div>
    </div>
  );
}
