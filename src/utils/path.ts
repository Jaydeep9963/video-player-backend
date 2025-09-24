import path from "path";
import fs from "fs";

/**
 * Convert multer file into web path for database storage
 * Always stores with forward slashes for consistency
 * Example: /uploads/videos/file.mp4
 */
export const getWebPath = (file: Express.Multer.File): string => {
  if (!file || !file.path) return "";
  
  // Get relative path from project root
  const relativePath = path.relative(process.cwd(), file.path);
  
  // Always normalize to forward slashes for web/database storage
  const webPath = relativePath.replace(/\\/g, "/");
  
  // Ensure it starts with / for web path
  return webPath.startsWith('/') ? webPath : '/' + webPath;
};

/**
 * Normalize any path to web format (forward slashes)
 * Used for database storage and API responses
 */
export const normalizeWebPath = (filePath: string): string => {
  if (!filePath) return filePath;
  
  // Convert all backslashes to forward slashes
  return filePath.replace(/\\/g, "/");
};

/**
 * Convert web path from database to absolute filesystem path
 * Handles OS-specific path separators correctly
 */
export const getAbsolutePath = (webPath: string): string => {
  if (!webPath) return "";

  // Remove leading slash and convert to OS-specific path
  const relativePath = webPath.replace(/^\/+/, "");
  
  // Use path.join to ensure proper OS-specific separators
  return path.join(process.cwd(), relativePath);
};

/**
 * Safely delete a file using web path from database
 */
export const safeDeleteFile = (webPath: string): void => {
  if (!webPath) return;

  try {
    const absolutePath = getAbsolutePath(webPath);
    
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      console.log(`File deleted successfully: ${absolutePath}`);
    } else {
      console.warn(`File not found, skipping deletion: ${absolutePath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${webPath}:`, error);
  }
};

/**
 * Check if file exists using web path from database
 */
export const fileExists = (webPath: string): boolean => {
  if (!webPath) return false;
  
  const absolutePath = getAbsolutePath(webPath);
  return fs.existsSync(absolutePath);
};

/**
 * Get file size using web path from database
 */
export const getFileSize = (webPath: string): number => {
  try {
    const absolutePath = getAbsolutePath(webPath);
    
    if (fs.existsSync(absolutePath)) {
      return fs.statSync(absolutePath).size;
    }
    return 0;
  } catch (error) {
    console.error(`Error getting file size for ${webPath}:`, error);
    return 0;
  }
};

/**
 * Join web paths safely (always forward slashes)
 * Useful for constructing web paths programmatically
 */
export const safeWebPath = (...segments: string[]): string => {
  const joined = segments
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/'); // Remove duplicate slashes
  
  return joined.startsWith('/') ? joined : '/' + joined;
};

/**
 * Convert absolute filesystem path back to web path
 * Useful when you need to store a filesystem path in database
 */
export const absoluteToWebPath = (absolutePath: string): string => {
  if (!absolutePath) return "";
  
  const relativePath = path.relative(process.cwd(), absolutePath);
  return normalizeWebPath('/' + relativePath);
};