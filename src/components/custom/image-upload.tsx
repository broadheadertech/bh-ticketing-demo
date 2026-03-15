"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { validateImageFile } from "@/lib/validators/image-upload";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { ImagePlus, X, Upload, Loader2 } from "lucide-react";
import Image from "next/image";

type UploadState = "idle" | "uploading" | "complete";

interface ImageUploadProps {
  eventId: string;
  eventTitle?: string;
  currentImageUrl?: string | null;
  onUploadComplete?: (storageId: string) => void;
}

export function ImageUpload({
  eventId,
  eventTitle,
  currentImageUrl,
  onUploadComplete,
}: ImageUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>(
    currentImageUrl ? "complete" : "idle"
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentImageUrl ?? null
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Revoke blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const updateEventArtwork = useMutation(api.events.updateEventArtwork);
  const removeEventArtwork = useMutation(api.events.removeEventArtwork);

  const handleFile = useCallback(
    async (file: File) => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        showErrorFromCatch(new Error(validation.error));
        return;
      }

      setUploadState("uploading");

      try {
        // Step 1: Get presigned upload URL
        const uploadUrl = await generateUploadUrl();

        // Step 2: POST file to Convex storage
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = await response.json();

        // Step 3: Save storage ID to event
        await updateEventArtwork({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eventId: eventId as any,
          artworkStorageId: storageId,
        });

        // Show preview — revoke old blob URL first
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        const newBlobUrl = URL.createObjectURL(file);
        blobUrlRef.current = newBlobUrl;
        setPreviewUrl(newBlobUrl);
        setUploadState("complete");
        showSuccess("Artwork uploaded successfully");
        onUploadComplete?.(storageId);
      } catch (error) {
        setUploadState(previewUrl ? "complete" : "idle");
        showErrorFromCatch(error);
      }
    },
    [eventId, generateUploadUrl, updateEventArtwork, onUploadComplete, previewUrl]
  );

  const handleRemove = async () => {
    try {
      await removeEventArtwork({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: eventId as any,
      });
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setPreviewUrl(null);
      setUploadState("idle");
      showSuccess("Artwork removed");
    } catch (error) {
      showErrorFromCatch(error);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (uploadState === "uploading") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Uploading artwork...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (uploadState === "complete" && previewUrl) {
    return (
      <Card data-testid="image-preview">
        <CardContent className="p-4 space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-md">
            <Image
              src={previewUrl}
              alt={eventTitle ? `${eventTitle} event artwork` : "Event artwork preview"}
              fill
              className="object-cover"
              unoptimized={previewUrl.startsWith("blob:")}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              data-testid="replace-artwork-btn"
            >
              <Upload className="mr-2 h-4 w-4" />
              Replace
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={handleRemove}
              data-testid="remove-artwork-btn"
            >
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="file-input"
          />
        </CardContent>
      </Card>
    );
  }

  // Idle state — dropzone
  return (
    <Card
      className={`cursor-pointer transition-colors ${
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-dashed hover:border-primary/50"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      data-testid="dropzone"
    >
      <CardContent className="py-12 text-center">
        <ImagePlus className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-4 text-sm font-medium">
          Drop an image here or click to upload
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPEG, PNG, or WebP — max 5MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
          data-testid="file-input"
        />
      </CardContent>
    </Card>
  );
}
