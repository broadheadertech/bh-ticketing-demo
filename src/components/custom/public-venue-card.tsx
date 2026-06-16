"use client";

import Link from "next/link";
import Image from "next/image";
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
      className="pcard"
    >
      <div className="frame">
        <div
          className="art"
          style={{
            aspectRatio: "16 / 10",
            background: "var(--paper-2)",
            display: "grid",
            placeItems: "center",
          }}
        >
          {firstPhotoUrl ? (
            <Image
              src={firstPhotoUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <Building2 size={48} style={{ color: "var(--ink-3)" }} />
          )}
          <span
            className="tag"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "var(--ink)",
              color: "var(--paper)",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Users size={12} />
            {capacity.toLocaleString()}
          </span>
        </div>
      </div>
      <div style={{ marginTop: 13 }}>
        <h3
          style={{
            fontSize: 18,
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </h3>
        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--ink-3)",
            marginTop: 4,
          }}
        >
          <MapPin size={13} style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {location}
          </span>
        </p>
        {amenities.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>
            {displayedAmenities.map((amenity) => (
              <span key={amenity} className="pill" style={{ fontSize: 11.5, padding: "4px 10px" }}>
                {amenity}
              </span>
            ))}
            {remainingCount > 0 && (
              <span
                className="pill"
                style={{ fontSize: 11.5, padding: "4px 10px", borderStyle: "dashed" }}
              >
                +{remainingCount} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export function PublicVenueCardSkeleton() {
  return <div className="pskel" style={{ aspectRatio: "16 / 12" }} />;
}
