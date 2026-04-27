import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a string for searching by:
 * 1. Converting to lowercase
 * 2. Removing all special characters (keeping alphanumeric and Arabic characters)
 * 3. Removing all whitespace
 */
export function normalizeSearchString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]/gi, '')
    .replace(/\s+/g, '')
    .trim();
}
