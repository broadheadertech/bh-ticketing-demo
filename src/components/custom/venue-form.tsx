"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  createVenueSchema,
  type CreateVenueFormData,
  type CreateVenueFormInput,
} from "@/lib/validators/venue";
import { validateImageFile } from "@/lib/validators/image-upload";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { VENUE_AMENITIES, MAX_VENUE_PHOTOS } from "@/lib/utils/constants";
import { ImagePlus, X, Loader2, Building2 } from "lucide-react";
import Image from "next/image";

type VenuePhotoEntry = {
  storageId: string;
  previewUrl: string;
  fromBlob: boolean;
};

type VenueFormProps = {
  mode: "create" | "edit";
  venueId?: string;
  initialData?: {
    name: string;
    location: string;
    capacity: number;
    description?: string;
    amenities: string[];
    photoUrls: string[];
    photoStorageIds: string[];
  };
};

export function VenueForm({ mode, venueId, initialData }: VenueFormProps) {
  const router = useRouter();
  const wasSubmittedRef = useRef(false);
  const pendingIdsToCleanRef = useRef<string[]>([]);

  // Create mode: hold pending storageIds locally until form submit
  const [createPhotos, setCreatePhotos] = useState<VenuePhotoEntry[]>([]);
  // Edit mode: mirror existing photos so we can track removals
  const [editPhotoUrls, setEditPhotoUrls] = useState<
    { storageId: string; url: string }[]
  >(
    initialData?.photoStorageIds.map((id, i) => ({
      storageId: id,
      url: initialData.photoUrls[i] ?? "",
    })) ?? []
  );

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.venues.generateVenuePhotoUploadUrl);
  const createVenueMutation = useMutation(api.venues.createVenue);
  const updateVenueMutation = useMutation(api.venues.updateVenue);
  const addPhotoMutation = useMutation(api.venues.addVenuePhoto);
  const removePhotoMutation = useMutation(api.venues.removeVenuePhoto);
  const deleteUploadMutation = useMutation(api.venues.deleteVenuePhotoUpload);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateVenueFormInput, unknown, CreateVenueFormData>({
    resolver: zodResolver(createVenueSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      location: initialData?.location ?? "",
      capacity: initialData?.capacity,
      description: initialData?.description ?? "",
      amenities: initialData?.amenities ?? [],
    },
  });

  const selectedAmenities = watch("amenities") ?? [];

  // Keep a stable ref to pending storageIds so the unmount cleanup can read
  // the latest value without stale closure issues.
  useEffect(() => {
    pendingIdsToCleanRef.current = createPhotos.map((p) => p.storageId);
  }, [createPhotos]);

  // Cleanup orphaned uploads if user abandons the create form without submitting
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    return () => {
      if (mode === "create" && !wasSubmittedRef.current) {
        pendingIdsToCleanRef.current.forEach((storageId) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          deleteUploadMutation({ storageId: storageId as any }).catch(() => {});
        });
      }
    };
  }, []);

  function toggleAmenity(amenity: string) {
    const current = selectedAmenities;
    if (current.includes(amenity)) {
      setValue("amenities", current.filter((a) => a !== amenity), { shouldValidate: true });
    } else {
      setValue("amenities", [...current, amenity], { shouldValidate: true });
    }
  }

  const currentPhotoCount =
    mode === "create" ? createPhotos.length : editPhotoUrls.length;
  const canAddMore = currentPhotoCount < MAX_VENUE_PHOTOS;

  async function handlePhotoFile(file: File) {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      showErrorFromCatch(new Error(validation.error));
      return;
    }

    setUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Photo upload failed");
      const { storageId } = await res.json();
      if (!storageId) throw new Error("Upload response missing storageId");

      if (mode === "create") {
        const blobUrl = URL.createObjectURL(file);
        setCreatePhotos((prev) => [...prev, { storageId, previewUrl: blobUrl, fromBlob: true }]);
      } else {
        // Edit mode: persist immediately
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await addPhotoMutation({ venueId: venueId as any, storageId });
        const blobUrl = URL.createObjectURL(file);
        setEditPhotoUrls((prev) => [...prev, { storageId, url: blobUrl }]);
        showSuccess("Photo added");
      }
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto(storageId: string) {
    if (mode === "create") {
      // Revoke blob URL to release memory (M1)
      const photo = createPhotos.find((p) => p.storageId === storageId);
      if (photo?.fromBlob) URL.revokeObjectURL(photo.previewUrl);
      setCreatePhotos((prev) => prev.filter((p) => p.storageId !== storageId));
      // Delete the orphaned upload from Convex storage (H2)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await deleteUploadMutation({ storageId: storageId as any });
      } catch {
        // Non-critical: file will be cleaned up by abandonment cleanup on unmount
      }
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await removePhotoMutation({ venueId: venueId as any, storageId: storageId as any });
        // Revoke blob URL if this was a freshly-uploaded preview (M1)
        const photo = editPhotoUrls.find((p) => p.storageId === storageId);
        if (photo?.url.startsWith("blob:")) URL.revokeObjectURL(photo.url);
        setEditPhotoUrls((prev) => prev.filter((p) => p.storageId !== storageId));
        showSuccess("Photo removed");
      } catch (error) {
        showErrorFromCatch(error);
      }
    }
  }

  async function onSubmit(data: CreateVenueFormData) {
    try {
      if (mode === "create") {
        await createVenueMutation({
          name: data.name,
          location: data.location,
          capacity: data.capacity,
          description: data.description || undefined,
          amenities: data.amenities,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          photoStorageIds: createPhotos.map((p) => p.storageId) as any,
        });
        showSuccess("Venue created successfully");
        wasSubmittedRef.current = true; // Prevents unmount cleanup from deleting submitted photos
        router.push("/dashboard/venues");
      } else {
        await updateVenueMutation({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          venueId: venueId as any,
          name: data.name,
          location: data.location,
          capacity: data.capacity,
          description: data.description || undefined,
          amenities: data.amenities,
        });
        showSuccess("Venue updated successfully");
      }
    } catch (error) {
      showErrorFromCatch(error);
    }
  }

  const photos = mode === "create"
    ? createPhotos.map((p) => ({ storageId: p.storageId, url: p.previewUrl }))
    : editPhotoUrls;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Name */}
      <div className="space-y-1">
        <Label htmlFor="name">Venue Name *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="e.g. The Loft Makati"
          maxLength={100}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-1">
        <Label htmlFor="location">Location *</Label>
        <Input
          id="location"
          {...register("location")}
          placeholder="e.g. Salcedo Village, Makati City"
          maxLength={200}
          aria-describedby={errors.location ? "location-error" : undefined}
        />
        {errors.location && (
          <p id="location-error" className="text-xs text-destructive">{errors.location.message}</p>
        )}
      </div>

      {/* Capacity */}
      <div className="space-y-1">
        <Label htmlFor="capacity">Capacity *</Label>
        <Input
          id="capacity"
          type="number"
          min={1}
          max={100000}
          {...register("capacity")}
          placeholder="e.g. 300"
          aria-describedby={errors.capacity ? "capacity-error" : undefined}
        />
        {errors.capacity && (
          <p id="capacity-error" className="text-xs text-destructive">{errors.capacity.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Describe your venue — layout options, special features, event history..."
          rows={4}
          maxLength={2000}
          aria-describedby={errors.description ? "description-error" : undefined}
        />
        {errors.description && (
          <p id="description-error" className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Amenities */}
      <div className="space-y-2">
        <Label>Amenities</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {VENUE_AMENITIES.map((amenity) => (
            <div key={amenity} className="flex items-center gap-2">
              <Checkbox
                id={`amenity-${amenity}`}
                checked={selectedAmenities.includes(amenity)}
                onCheckedChange={() => toggleAmenity(amenity)}
              />
              <Label htmlFor={`amenity-${amenity}`} className="font-normal text-sm cursor-pointer">
                {amenity}
              </Label>
            </div>
          ))}
        </div>
        {errors.amenities && (
          <p className="text-xs text-destructive">{errors.amenities.message}</p>
        )}
      </div>

      {/* Photos */}
      <div className="space-y-2">
        <Label>
          Photos{" "}
          <span className="text-xs text-muted-foreground font-normal">
            ({currentPhotoCount}/{MAX_VENUE_PHOTOS})
          </span>
        </Label>

        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo) => (
              <div key={photo.storageId} className="relative group aspect-square">
                <div className="relative w-full h-full rounded-md overflow-hidden bg-muted">
                  <Image
                    src={photo.url}
                    alt="Venue photo"
                    fill
                    className="object-cover"
                    unoptimized={photo.url.startsWith("blob:")}
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.storageId)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {canAddMore && (
          <Card
            className="border-dashed cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
          >
            <CardContent className="py-6 text-center">
              {uploadingPhoto ? (
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImagePlus className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Add photo — JPEG, PNG, or WebP, max 5MB
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePhotoFile(file);
          }}
          data-testid="venue-photo-input"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || uploadingPhoto}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === "create" ? "Creating..." : "Saving..."}
            </>
          ) : mode === "create" ? (
            "Create Venue"
          ) : (
            "Save Changes"
          )}
        </Button>
        {mode === "create" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/venues")}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Skeleton for venue card used on list page
// ---------------------------------------------------------------------------
export function VenueCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3 animate-pulse">
      <div className="aspect-video bg-muted rounded-md" />
      <div className="h-5 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Venue card for list page
// ---------------------------------------------------------------------------
export function VenueCard({
  venue,
}: {
  venue: {
    _id: string;
    name: string;
    location: string;
    capacity: number;
    photoUrls: string[];
    photoStorageIds: string[];
  };
}) {
  return (
    <div className="border rounded-lg overflow-hidden space-y-0">
      <div className="relative aspect-video bg-muted">
        {venue.photoUrls[0] ? (
          <Image
            src={venue.photoUrls[0]}
            alt={venue.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="p-4 space-y-1">
        <p className="font-semibold text-sm">{venue.name}</p>
        <p className="text-xs text-muted-foreground">{venue.location}</p>
        <p className="text-xs text-muted-foreground">
          Capacity: {venue.capacity.toLocaleString()} ·{" "}
          {venue.photoStorageIds.length} photo{venue.photoStorageIds.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
