/**
 * Standard paginated response envelope returned by list endpoints across all services.
 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export function buildPageResponse<T>(content: T[], page: number, size: number, totalElements: number): PageResponse<T> {
  const totalPages = size > 0 ? Math.ceil(totalElements / size) : 0;
  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    last: page >= totalPages - 1,
  };
}
