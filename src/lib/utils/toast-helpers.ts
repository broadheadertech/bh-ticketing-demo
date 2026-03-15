import { toast } from "sonner";
import { ConvexError } from "convex/values";

export function showSuccess(message: string) {
  toast.success(message);
}

export function showError(message: string) {
  toast.error(message);
}

export function showErrorFromCatch(error: unknown) {
  const message =
    error instanceof ConvexError
      ? typeof error.data === "string"
        ? error.data
        : "An unexpected error occurred"
      : error instanceof Error
        ? error.message
        : "An unexpected error occurred";
  toast.error(message);
}
