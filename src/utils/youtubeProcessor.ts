import ytdl from "ytdl-core";

/**
 * Get YouTube video information including duration
 * @param {string} youtubeUrl - YouTube video URL
 * @returns {Promise<{duration: number, title?: string, description?: string}>}
 */
export const getYouTubeVideoInfo = async (
  youtubeUrl: string
): Promise<{
  duration: number;
  title?: string;
  description?: string;
}> => {
  try {
    // Validate if it's a valid YouTube URL
    if (!ytdl.validateURL(youtubeUrl)) {
      throw new Error("Invalid YouTube URL");
    }

    // Get video info
    const info = await ytdl.getInfo(youtubeUrl);

    // Extract duration in seconds
    const duration = parseInt(info.videoDetails.lengthSeconds) || 0;

    // Optional: Extract title and description
    const title = info.videoDetails.title;
    const description = info.videoDetails.description || undefined;

    return {
      duration,
      title,
      description,
    };
  } catch (error) {
    console.warn("Could not get YouTube video info:", error);
    // If YouTube info extraction fails, return fallback values
    return {
      duration: 0,
    };
  }
};

/**
 * Validate YouTube URL
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
export const isValidYouTubeUrl = (url: string): boolean => {
  try {
    return ytdl.validateURL(url);
  } catch {
    return false;
  }
};
