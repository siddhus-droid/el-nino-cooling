import axios, { AxiosError } from "axios";
import type {
  AppErrorResponse,
  NormalizedApiError,
  ValidationErrorResponse,
} from "./types";

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
});

/**
 * The backend has two distinct error shapes:
 *  - Custom AppBaseException handler: { status, error_type, message, details }
 *  - Default FastAPI/Pydantic 422:    { detail: [{ loc, msg, type }, ...] }
 * This normalizes both (plus network failures) into one shape the UI can
 * render consistently.
 */
export function normalizeApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    if (!axiosError.response) {
      return {
        statusCode: null,
        message:
          "Could not reach the backend. Confirm the API is running at " +
          API_BASE_URL +
          " and reachable from this browser.",
        isNetworkError: true,
      };
    }

    const status = axiosError.response.status;
    const data = axiosError.response.data as
      | AppErrorResponse
      | ValidationErrorResponse
      | undefined;

    // Custom AppBaseException format
    if (data && "message" in data && "error_type" in data) {
      return {
        statusCode: status,
        message: data.message,
        isNetworkError: false,
      };
    }

    // Pydantic validation error format
    if (data && "detail" in data && Array.isArray(data.detail)) {
      const fieldErrors = data.detail.map((d) => ({
        field: String(d.loc[d.loc.length - 1] ?? "field"),
        message: d.msg,
      }));
      return {
        statusCode: status,
        message: fieldErrors.map((f) => `${f.field}: ${f.message}`).join("; "),
        fieldErrors,
        isNetworkError: false,
      };
    }

    return {
      statusCode: status,
      message: `Request failed with status ${status}.`,
      isNetworkError: false,
    };
  }

  return {
    statusCode: null,
    message: error instanceof Error ? error.message : "An unknown error occurred.",
    isNetworkError: false,
  };
}
