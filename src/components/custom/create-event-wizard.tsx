"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import {
  eventDetailsSchema,
  type EventDetailsFormData,
  type EventType,
} from "@/lib/validators/event";
import {
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_DESCRIPTIONS,
} from "@/lib/utils/constants";
import { EVENT_THEMES, THEME_ORDER, themeForEvent } from "@/lib/themes";
import { ParticipantPicker } from "@/components/custom/participant-picker";
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
import { VenuePicker } from "@/components/custom/venue-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import {
  Music,
  Flag,
  BookOpen,
  GraduationCap,
  Calendar,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const EVENT_TYPE_ICONS: Record<string, LucideIcon> = {
  concert: Music,
  racing: Flag,
  seminar: BookOpen,
  class: GraduationCap,
  other: Calendar,
};

const STEP_LABELS = ["Event Type", "Details", "Review"];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEP_LABELS.map((label, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            {index > 0 && (
              <div
                className={`h-px w-8 ${isCompleted ? "bg-primary" : "bg-muted"}`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {stepNum}
              </div>
              <span
                className={`text-sm ${isActive ? "font-medium" : "text-muted-foreground"}`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepEventType({
  onSelect,
}: {
  onSelect: (type: EventType) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        What type of event are you creating?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EVENT_TYPES.map((type) => {
          const Icon = EVENT_TYPE_ICONS[type];
          return (
            <Card
              key={type}
              data-testid={`event-type-${type}`}
              className="cursor-pointer transition-colors hover:border-primary"
              onClick={() => onSelect(type as EventType)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">
                    {EVENT_TYPE_LABELS[type]}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {EVENT_TYPE_DESCRIPTIONS[type]}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StepDetails({
  eventType,
  onSubmit,
  onBack,
  initialData,
  selectedVenueId,
  onVenueSelect,
  onVenueClear,
}: {
  eventType: EventType;
  onSubmit: (data: EventDetailsFormData) => void;
  onBack: () => void;
  initialData?: EventDetailsFormData | null;
  selectedVenueId?: string;
  onVenueSelect: (venueId: string, venueName: string) => void;
  onVenueClear: () => void;
}) {
  const [venueMode, setVenueMode] = useState<"pick" | "manual">(
    selectedVenueId ? "pick" : "manual"
  );

  const form = useForm<EventDetailsFormData>({
    resolver: zodResolver(eventDetailsSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      date: initialData?.date ?? "",
      time: initialData?.time ?? "",
      venueName: initialData?.venueName ?? "",
      theme: initialData?.theme,
      lineupArtistIds: initialData?.lineupArtistIds ?? [],
      tagline: initialData?.tagline ?? "",
      endTime: initialData?.endTime ?? "",
      doorsTime: initialData?.doorsTime ?? "",
      city: initialData?.city ?? "",
      locationType: initialData?.locationType ?? "venue",
      onlineUrl: initialData?.onlineUrl ?? "",
      onSaleStart: initialData?.onSaleStart ?? "",
      onSaleEnd: initialData?.onSaleEnd ?? "",
      maxPerOrder: initialData?.maxPerOrder ?? "",
      visibility: initialData?.visibility ?? "public",
      refundPolicy: initialData?.refundPolicy ?? "",
      ageRestriction: initialData?.ageRestriction ?? "",
      goodToKnow: initialData?.goodToKnow ?? "",
    },
    mode: "onBlur",
  });

  const locationType = form.watch("locationType");

  const descriptionValue = form.watch("description") ?? "";

  function handleVenueSelect(venueId: string, venueName: string) {
    onVenueSelect(venueId, venueName);
    form.setValue("venueName", venueName);
  }

  function handleVenueClear() {
    onVenueClear();
    form.setValue("venueName", "");
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          data-testid="back-button"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-lg font-semibold">Event Details</h2>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-w-2xl space-y-6"
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Event title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tagline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tagline (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="One line shown on cards & hero" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your event..."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-between">
                  <FormMessage />
                  <span className="text-xs text-muted-foreground">
                    {descriptionValue.length}/5000
                  </span>
                </div>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="doorsTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doors open (optional)</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End time (optional)</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Location type */}
          <FormField
            control={form.control}
            name="locationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location type</FormLabel>
                <FormControl>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    {...field}
                  >
                    <option value="venue">In-person venue</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {(locationType === "online" || locationType === "hybrid") && (
            <FormField
              control={form.control}
              name="onlineUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Online / stream URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Venue selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FormLabel>Venue (optional)</FormLabel>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={venueMode === "pick" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setVenueMode("pick")}
                >
                  Browse Venues
                </Button>
                <Button
                  type="button"
                  variant={venueMode === "manual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setVenueMode("manual");
                    handleVenueClear();
                  }}
                >
                  Enter Manually
                </Button>
              </div>
            </div>

            {venueMode === "pick" ? (
              <VenuePicker
                onSelect={handleVenueSelect}
                selectedVenueId={selectedVenueId}
                onClear={handleVenueClear}
              />
            ) : (
              <FormField
                control={form.control}
                name="venueName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Where is this event?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City / region (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Pasay City" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Ticketing settings */}
          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-medium">Ticketing settings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxPerOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max tickets / order (optional)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} placeholder="e.g. 8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                        {...field}
                      >
                        <option value="public">Public — listed in Browse</option>
                        <option value="unlisted">Unlisted — link only</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="onSaleStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales open (optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="onSaleEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales close (optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Policies / good to know */}
          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-medium">Policies &amp; good to know</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ageRestriction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age restriction (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 18+, All ages" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="refundPolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refund policy (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. No refunds; transfers allowed" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="goodToKnow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Good to know (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Doors, re-entry, what to bring, parking…" className="min-h-20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Event theme — the visual world the public event page wears */}
          <FormField
            control={form.control}
            name="theme"
            render={({ field }) => {
              const defaultTheme = themeForEvent({ eventType });
              const selected = field.value ?? defaultTheme.id;
              return (
                <FormItem>
                  <FormLabel>Event theme</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {THEME_ORDER.map((id) => {
                          const t = EVENT_THEMES[id];
                          const isOn = selected === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              title={t.name}
                              aria-label={t.name}
                              aria-pressed={isOn}
                              onClick={() => field.onChange(id)}
                              className={`h-9 flex-1 rounded-md border transition-shadow ${
                                isOn
                                  ? "ring-2 ring-primary ring-offset-2"
                                  : "opacity-80 hover:opacity-100"
                              }`}
                              style={{ background: t.grad }}
                            />
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {EVENT_THEMES[selected as keyof typeof EVENT_THEMES].name}{" "}
                        — {EVENT_THEMES[selected as keyof typeof EVENT_THEMES].tagline}
                        {!field.value && " (default for this event type)"}
                      </p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* Lineup — artists performing at this event */}
          <FormField
            control={form.control}
            name="lineupArtistIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lineup (optional)</FormLabel>
                <FormControl>
                  <ParticipantPicker
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit">Continue to Review</Button>
        </form>
      </Form>
    </div>
  );
}

function StepReview({
  eventType,
  details,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  eventType: EventType;
  details: EventDetailsFormData;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const Icon = EVENT_TYPE_ICONS[eventType];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          data-testid="back-button"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-lg font-semibold">Review & Create</h2>
      </div>
      <Card className="max-w-2xl">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <span className="font-medium">{EVENT_TYPE_LABELS[eventType]}</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Title</p>
            <p className="font-medium">{details.title}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="whitespace-pre-wrap">{details.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{details.date}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-medium">{details.time}</p>
            </div>
          </div>
          {details.venueName && (
            <div>
              <p className="text-sm text-muted-foreground">Venue</p>
              <p className="font-medium">{details.venueName}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Theme</p>
            <p className="font-medium flex items-center gap-2">
              <span
                className="inline-block h-4 w-7 rounded border"
                style={{
                  background: themeForEvent({
                    theme: details.theme,
                    eventType,
                  }).grad,
                }}
              />
              {themeForEvent({ theme: details.theme, eventType }).name}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lineup</p>
            <p className="font-medium">
              {details.lineupArtistIds && details.lineupArtistIds.length > 0
                ? `${details.lineupArtistIds.length} artist${details.lineupArtistIds.length === 1 ? "" : "s"}`
                : "None"}
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6">
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Create Event
        </Button>
      </div>
    </div>
  );
}

export function CreateEventWizard() {
  const router = useRouter();
  const createEvent = useMutation(api.events.createEvent);
  const [currentStep, setCurrentStep] = useState(1);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [details, setDetails] = useState<EventDetailsFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState<string | undefined>();

  const handleSelectType = (type: EventType) => {
    setEventType(type);
    setCurrentStep(2);
  };

  const handleDetailsSubmit = (data: EventDetailsFormData) => {
    setDetails(data);
    setCurrentStep(3);
  };

  const handleCreate = async () => {
    if (!eventType || !details) return;
    setIsSubmitting(true);
    try {
      // Parse as local midnight to avoid UTC timezone shift
      const dateMs = new Date(details.date + "T00:00:00").getTime();
      const toMs = (s?: string) => {
        if (!s) return undefined;
        const t = new Date(s).getTime();
        return isNaN(t) ? undefined : t;
      };
      await createEvent({
        eventType,
        theme: details.theme,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        participantIds: (details.lineupArtistIds ?? []) as any,
        title: details.title,
        tagline: details.tagline || undefined,
        description: details.description,
        date: dateMs,
        time: details.time,
        endTime: details.endTime || undefined,
        doorsTime: details.doorsTime || undefined,
        venueName: details.venueName || undefined,
        venueId: selectedVenueId || undefined,
        city: details.city || undefined,
        locationType: details.locationType || undefined,
        onlineUrl: details.onlineUrl || undefined,
        onSaleStart: toMs(details.onSaleStart),
        onSaleEnd: toMs(details.onSaleEnd),
        maxPerOrder: details.maxPerOrder ? Number(details.maxPerOrder) : undefined,
        visibility: details.visibility || undefined,
        refundPolicy: details.refundPolicy || undefined,
        ageRestriction: details.ageRestriction || undefined,
        goodToKnow: details.goodToKnow || undefined,
      });
      showSuccess("Event created as draft");
      router.push("/dashboard/events");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <StepIndicator currentStep={currentStep} />
      {currentStep === 1 && <StepEventType onSelect={handleSelectType} />}
      {currentStep === 2 && eventType && (
        <StepDetails
          eventType={eventType}
          onSubmit={handleDetailsSubmit}
          onBack={() => setCurrentStep(1)}
          initialData={details}
          selectedVenueId={selectedVenueId}
          onVenueSelect={(venueId, _venueName) => setSelectedVenueId(venueId)}
          onVenueClear={() => setSelectedVenueId(undefined)}
        />
      )}
      {currentStep === 3 && eventType && details && (
        <StepReview
          eventType={eventType}
          details={details}
          onBack={() => setCurrentStep(2)}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
