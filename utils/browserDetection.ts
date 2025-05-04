/**
 * Browser detection utilities for safely using browser-only APIs
 */

// Check if code is running in a browser environment
export const isBrowser = typeof window !== 'undefined';

// Check if FileList API is available
export const hasFileListAPI = isBrowser && typeof FileList !== 'undefined';

// Check if FileReader API is available
export const hasFileReaderAPI = isBrowser && typeof FileReader !== 'undefined';

// Safe way to check if a given object is a FileList
export const isFileList = (obj: any): obj is FileList => {
  if (!isBrowser) return false;
  return obj instanceof FileList;
}; 