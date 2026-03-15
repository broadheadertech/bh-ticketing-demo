"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  creatorProfileSchema,
  type CreatorProfileFormData,
} from "@/lib/validators/creator-profile";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export function CreatorProfileForm() {
  const profile = useQuery(api.creatorProfiles.getMyProfile);
  const user = useQuery(api.users.getCurrentUser);
  const upsertProfile = useMutation(api.creatorProfiles.upsertProfile);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<CreatorProfileFormData>({
    resolver: zodResolver(creatorProfileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      profilePhotoUrl: "",
      websiteUrl: "",
      instagramUrl: "",
      spotifyUrl: "",
      facebookUrl: "",
    },
    mode: "onBlur",
  });

  // Pre-populate form when profile data loads
  useEffect(() => {
    if (profile) {
      form.reset({
        displayName: profile.displayName,
        bio: profile.bio ?? "",
        profilePhotoUrl: profile.profilePhotoUrl ?? "",
        websiteUrl: profile.websiteUrl ?? "",
        instagramUrl: profile.instagramUrl ?? "",
        spotifyUrl: profile.spotifyUrl ?? "",
        facebookUrl: profile.facebookUrl ?? "",
      });
    } else if (profile === null && user) {
      // No profile yet — pre-fill displayName from user's name
      form.reset({
        displayName: user.name,
        bio: "",
        profilePhotoUrl: "",
        websiteUrl: "",
        instagramUrl: "",
        spotifyUrl: "",
        facebookUrl: "",
      });
    }
  }, [profile, user, form]);

  // Loading state
  if (profile === undefined || user === undefined) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const onSubmit = async (data: CreatorProfileFormData) => {
    setIsSaving(true);
    try {
      await upsertProfile({
        displayName: data.displayName,
        bio: data.bio || undefined,
        profilePhotoUrl: data.profilePhotoUrl || undefined,
        websiteUrl: data.websiteUrl || undefined,
        instagramUrl: data.instagramUrl || undefined,
        spotifyUrl: data.spotifyUrl || undefined,
        facebookUrl: data.facebookUrl || undefined,
      });
      showSuccess("Profile saved!");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setIsSaving(false);
    }
  };

  const bioValue = form.watch("bio") ?? "";

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-2xl space-y-6"
      >
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Your display name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell people about yourself..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between">
                <FormMessage />
                <span className="text-xs text-muted-foreground">
                  {bioValue.length}/2000
                </span>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="profilePhotoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Photo URL (optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/photo.jpg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-sm font-medium">External Links</h3>

          <FormField
            control={form.control}
            name="websiteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://yourwebsite.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="instagramUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://instagram.com/yourhandle"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="spotifyUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Spotify (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://open.spotify.com/artist/..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="facebookUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Facebook (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://facebook.com/yourpage"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </form>
    </Form>
  );
}
