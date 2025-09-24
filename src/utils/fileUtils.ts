import fs from "fs";
import path from "path";

/**
 * Convert web path (/uploads/...) or absolute path to real absolute disk path
 * Works consistently across Windows, macOS, and Linux
 */
export const getAbsolutePath = (filePath: string): string => {
  if (!filePath) return "";

  // Normalize the path first to handle mixed slashes
  const normalizedPath = path.normalize(filePath);

  // Already absolute → return directly
  if (path.isAbsolute(normalizedPath)) return normalizedPath;

  // Convert /uploads/... → <projectRoot>/uploads/...
  // Remove leading slash for relative path join
  const relativePath = normalizedPath.startsWith('/') || normalizedPath.startsWith('\\') 
    ? normalizedPath.slice(1) 
    : normalizedPath;

  return path.join(process.cwd(), relativePath);
};

/**
 * Safely delete a file
 * Uses proper path resolution for cross-platform compatibility
 */
export const safeDeleteFile = (filePath: string): void => {
  if (!filePath) return;

  try {
    const absolutePath = getAbsolutePath(filePath);

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      console.log(`File deleted successfully: ${absolutePath}`);
    } else {
      console.warn(`File not found, skipping deletion: ${absolutePath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
};

/**
 * Check if file exists
 * Uses proper path resolution for cross-platform compatibility
 */
export const fileExists = (filePath: string): boolean => {
  if (!filePath) return false;
  const absolutePath = getAbsolutePath(filePath);
  return fs.existsSync(absolutePath);
};

/**
 * Get file size in bytes
 */
export const getFileSize = (filePath: string): number => {
  try {
    const absolutePath = getAbsolutePath(filePath);
    if (fs.existsSync(absolutePath)) {
      return fs.statSync(absolutePath).size;
    }
    return 0;
  } catch (error) {
    console.error(`Error getting file size for ${filePath}:`, error);
    return 0;
  }
};