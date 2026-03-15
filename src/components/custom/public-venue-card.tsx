"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Users } from "lucide-react";

type PublicVenueCardProps = {
  venueId: string;
  name: string;
  location: string;
  capacity: number;
  amenities: string[];
  firstPhotoUrl: string | null;
};

export function PublicVenueCard({
  venueId,
  name,
  location,
  capacity,
  amenities,
  firstPhotoUrl,
}: PublicVenueCardProps) {
  const displayedAmenities = amenities.slice(0, 3);
  const remainingCount = amenities.length - displayedAmenities.length;

  return (
    <Link
      href={`/venues/${venueId}`}
      aria-label={`${name} in ${location} — capacity ${capacity}`}
      className="group block rounded-lg border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {firstPhotoUrl ? (
          <Image
            src={firstPhotoUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs gap-1">
            <Users className="h-3 w-3" />
            {capacity.toLocaleString()}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="text-base font-semibold line-clamp-1 leading-snug">
          {name}
        </h3>
        <p className="flex items-center gap-1 text-sm text-muted-foreground truncate">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{location}</span>
        </p>
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {displayedAmenities.map((amenity) => (
              <Badge key={amenity} variant="outline" className="text-xs">
                {amenity}
              </Badge>
            ))}
            {remainingCount > 0 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{remainingCount} more
              </Badge>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export function PublicVenueCardSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden bg-card">
      <div className="aspect-video w-full bg-muted animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
        <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}
