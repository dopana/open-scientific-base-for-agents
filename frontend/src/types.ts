/** Mirrors the Rust `FileEntry` model */
export interface FileEntry {
  id: string;
  path: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  version: string;
  last_updated: string;
}

/** Mirrors the Rust `FileSummary` model */
export interface FileSummary {
  id: string;
  path: string;
  title: string;
  category: string;
  tags: string[];
  version: string;
  last_updated: string;
}

/** Mirrors the Rust `CategoryInfo` model */
export interface CategoryInfo {
  name: string;
  count: number;
}

/** Mirrors the Rust `SearchQuery` model */
export interface SearchQuery {
  query: string;
  category?: string;
  limit?: number;
}

/** Mirrors the Rust `UpdateRequest` model */
export interface UpdateRequest {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
}

/** Category display configuration */
export interface CategoryConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
}
