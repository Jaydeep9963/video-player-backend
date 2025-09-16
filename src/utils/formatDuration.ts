/**
 * Format seconds into hh:mm:ss (or mm:ss if < 1 hr)
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted time string
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 0) return "00:00";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const paddedMins = String(mins).padStart(2, "0");
  const paddedSecs = String(secs).padStart(2, "0");

  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${paddedMins}:${paddedSecs}`;
  }
  return `${paddedMins}:${paddedSecs}`;
};
