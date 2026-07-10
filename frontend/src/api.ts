import type {
  CategoryInfo,
  FileEntry,
  FileSummary,
  SearchQuery,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/** Reusable fetch wrapper with error handling */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

/** List all files, optionally filtered by category */
export async function listFiles(category?: string): Promise<FileSummary[]> {
  const params = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiFetch<FileSummary[]>(`/api/files${params}`);
}

/** Get a single file by ID */
export async function getFile(id: string): Promise<FileEntry> {
  return apiFetch<FileEntry>(`/api/files/${encodeURIComponent(id)}`);
}

/** Search files by query with optional category filter */
export async function searchFiles(query: SearchQuery): Promise<FileSummary[]> {
  return apiFetch<FileSummary[]>('/api/search', {
    method: 'POST',
    body: JSON.stringify(query),
  });
}

/** List all categories with file counts */
export async function listCategories(): Promise<CategoryInfo[]> {
  return apiFetch<CategoryInfo[]>('/api/categories');
}

/** Check API health */
export async function healthCheck(): Promise<{
  status: string;
  service: string;
  version: string;
}> {
  return apiFetch('/api/health');
}
