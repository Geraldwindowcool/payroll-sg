// MC attachment upload rules — pure functions, no I/O, same reasoning as
// every other src/lib/*.ts file: worth unit testing directly, since a
// wrong size/type check either blocks a real MC photo or lets through
// something the file-serving route shouldn't have to handle.

export const MC_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB — a photo or scan comfortably fits; a video or a whole PDF book of scans shouldn't.

export const MC_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "application/pdf"];

export function validateMcFile(file: { size: number; type: string }): string | null {
  if (file.size <= 0) return "That file looks empty — try choosing it again.";
  if (file.size > MC_MAX_FILE_SIZE) return "That file is too large — MC photos/PDFs must be under 5MB.";
  if (!MC_ALLOWED_TYPES.includes(file.type)) return "Only photos (JPG, PNG, HEIC, WebP) or PDFs are accepted.";
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
