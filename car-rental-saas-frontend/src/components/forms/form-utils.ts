import axios from "axios";
import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";

import type { ApiErrorPayload } from "@/types/common";

export function applyServerValidationErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
) {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return;
  }

  const payload = error.response?.data;

  if (!payload) {
    return;
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    const message = Array.isArray(value) ? value.join(" ") : value;
    setError(key as FieldPath<TFieldValues>, {
      type: "server",
      message,
    });
  });
}

