import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function extractApiError(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; details?: Array<{ path?: string; message?: string }> }
      | undefined;

    if (data?.details && Array.isArray(data.details) && data.details.length > 0) {
      return data.details.map((d) => d.message).filter(Boolean).join('. ');
    }
    if (data?.message) {
      return data.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
