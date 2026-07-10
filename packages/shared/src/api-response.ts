export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function apiOk<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function apiFail(error: string, code?: string): ApiError {
  return { success: false, error, code };
}

export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return !response.success;
}
