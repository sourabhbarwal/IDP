/**
 * Standard error response shape used by every IDP backend service, following
 * RFC 7807 (Problem Details for HTTP APIs).
 */
export interface ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  errors?: Record<string, unknown>;
}

export function buildErrorResponse(
  type: string,
  title: string,
  status: number,
  detail: string,
  instance: string,
  errors?: Record<string, unknown>,
): ErrorResponse {
  return {
    type,
    title,
    status,
    detail,
    instance,
    timestamp: new Date().toISOString(),
    ...(errors ? { errors } : {}),
  };
}

export function buildValidationErrorResponse(
  instance: string,
  fieldErrors: Record<string, unknown>,
): ErrorResponse {
  return buildErrorResponse(
    'https://idp.platform/errors/validation',
    'Validation Failed',
    422,
    'One or more fields are invalid',
    instance,
    fieldErrors,
  );
}
