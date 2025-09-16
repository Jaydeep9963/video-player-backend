import play from "play-dl";

/**
 * Get YouTube video information including duration
 */
export const getYouTubeVideoInfo = async (
  youtubeUrl: string
): Promise<{ duration: number; title?: string; description?: string }> => {
  try {
    if (!play.yt_validate(youtubeUrl)) {
      throw new Error("Invalid YouTube URL");
    }

    const info = await play.video_basic_info(youtubeUrl);

    const duration = info.video_details.durationInSec ?? 0;
    const title = info.video_details.title;
    const description = info.video_details.description || undefined;

    return { duration, title, description };
  } catch (error) {
    console.warn("Could not get YouTube video info:", error);
    return { duration: 0 };
  }
};

/**
 * Validate YouTube URL
 */
export const isValidYouTubeUrl = (url: string): boolean => {
  try {
    return play.yt_validate(url) === "video"; // must return "video"
  } catch {
    return false;
  }
};
