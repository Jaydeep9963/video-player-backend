import ffmpeg from "fluent-ffmpeg";

// Set ffprobe path
ffmpeg.setFfprobePath("/usr/local/bin/ffprobe");

/**
 * Get video duration using ffprobe
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<number>} - Duration in seconds
 */
export const getVideoDuration = (videoPath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration || 0);
    });
  });
};
