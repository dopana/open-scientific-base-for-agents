import type { CategoryConfig } from './types';

/** Display configuration for each scientific category */
export const CATEGORIES: CategoryConfig[] = [
  {
    key: 'physics',
    label: 'Physics',
    icon: '⚛️',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    key: 'biology',
    label: 'Biology',
    icon: '🧬',
    color: 'from-emerald-500 to-teal-400',
  },
  {
    key: 'chemistry',
    label: 'Chemistry',
    icon: '🧪',
    color: 'from-purple-500 to-pink-400',
  },
  {
    key: 'computer-science',
    label: 'Computer Science',
    icon: '💻',
    color: 'from-orange-500 to-amber-400',
  },
  {
    key: 'mathematics',
    label: 'Mathematics',
    icon: '📐',
    color: 'from-red-500 to-rose-400',
  },
];

/** Map category key to its config */
export const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.key, c]));

/** Format a date string for display */
export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Strip YAML frontmatter from markdown content */
export function stripFrontmatter(content: string): string {
  return content.replace(/^---[\s\S]*?---\n*/, '');
}
