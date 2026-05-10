import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a string for searching by:
 * 1. Converting to lowercase
 * 2. Removing all special characters (keeping alphanumeric and Arabic characters)
 * 3. Preserving single spaces between words for tokenization
 */
export function normalizeSearchString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s]/gi, ' ') // Replace non-alphanumeric (except spaces) with a space
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Ensures a URL is absolute by prepending 'https:' to protocol-relative URLs (//).
 * Also handles invalid or empty inputs gracefully.
 */
export function ensureAbsoluteUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  // Basic validation to ensure it's at least potentially a URL
  if (trimmed.length > 0 && !trimmed.startsWith('http') && !trimmed.startsWith('/') && !trimmed.startsWith('data:')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}
