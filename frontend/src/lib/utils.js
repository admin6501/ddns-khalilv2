import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Trigger a browser file download for a Blob (e.g. CSV from axios responseType:'blob').
 * Used by Dashboard CSV export and Admin CSV export.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** ISO timestamp safe for filenames: 2025-01-01T12-00-00 */
export function fileTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
