import { describe, it, expect } from "vitest";
import { validateMcFile, formatFileSize, MC_MAX_FILE_SIZE } from "./mcAttachments";

describe("validateMcFile — what's allowed to attach to an MC record", () => {
  it("accepts a normal-sized photo", () => {
    expect(validateMcFile({ size: 800_000, type: "image/jpeg" })).toBeNull();
  });

  it("accepts a normal-sized PDF", () => {
    expect(validateMcFile({ size: 1_200_000, type: "application/pdf" })).toBeNull();
  });

  it("rejects an empty file", () => {
    expect(validateMcFile({ size: 0, type: "image/jpeg" })).not.toBeNull();
  });

  it("rejects a file over the size limit", () => {
    expect(validateMcFile({ size: MC_MAX_FILE_SIZE + 1, type: "image/jpeg" })).not.toBeNull();
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateMcFile({ size: MC_MAX_FILE_SIZE, type: "image/jpeg" })).toBeNull();
  });

  it("rejects a disallowed file type (e.g. a video or a Word doc)", () => {
    expect(validateMcFile({ size: 1000, type: "video/mp4" })).not.toBeNull();
    expect(validateMcFile({ size: 1000, type: "application/msword" })).not.toBeNull();
  });
});

describe("formatFileSize — human-readable sizes", () => {
  it("shows bytes for tiny files", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("shows KB for files under 1MB", () => {
    expect(formatFileSize(150_000)).toBe("146 KB");
  });

  it("shows MB with one decimal for larger files", () => {
    expect(formatFileSize(2_400_000)).toBe("2.3 MB");
  });
});
