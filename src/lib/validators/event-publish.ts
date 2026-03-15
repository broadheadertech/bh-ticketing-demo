interface PublishCheckResult {
  canPublish: boolean;
  reason?: string;
}

export function canPublishEvent(
  event: { status: string; date: number },
  tierCount: number
): PublishCheckResult {
  if (event.status !== "draft") {
    return { canPublish: false, reason: "Only draft events can be published" };
  }

  if (tierCount === 0) {
    return { canPublish: false, reason: "Add at least one ticket tier before publishing" };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (event.date < now.getTime()) {
    return { canPublish: false, reason: "Cannot publish an event with a past date" };
  }

  return { canPublish: true };
}
