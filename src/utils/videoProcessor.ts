import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Try to use ffprobe installer if available
try {
  const ffprobeInstaller = require("@ffprobe-installer/ffprobe");
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
  console.log("Using ffprobe from installer:", ffprobeInstaller.path);
} catch (e) {
  // Fallback to system ffprobe paths
  const possiblePaths = [
    "/usr/local/bin/ffprobe",
    "/usr/bin/ffprobe",
    "C:\\ffmpeg\\bin\\ffprobe.exe", // Windows
    "ffprobe" // System PATH
  ];
  
  let ffprobeFound = false;
  for (const path of possiblePaths) {
    try {
      ffmpeg.setFfprobePath(path);
      console.log(`Trying ffprobe path: ${path}`);
      ffprobeFound = true;
      break;
    } catch (err) {
      continue;
    }
  }
  
  if (!ffprobeFound) {
    console.warn("ffprobe not found in common paths. Duration extraction may fail.");
  }
}

/**
 * Get video duration using ffprobe
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<number>} - Duration in seconds
 */
export const getVideoDuration = (videoPath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    console.log("Extracting duration from:", videoPath);
    
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error("FFprobe error:", err);
        // Instead of rejecting, resolve with 0 to prevent upload failures
        resolve(0);
        return;
      }

      try {
        const duration = metadata?.format?.duration;
        if (typeof duration === 'number' && duration > 0) {
          console.log("Duration extracted:", Math.floor(duration), "seconds");
          resolve(Math.floor(duration));
        } else {
          // Try to get duration from video stream as fallback
          const videoStream = metadata?.streams?.find(stream => stream.codec_type === 'video');
          if (videoStream?.duration) {
            const streamDuration = Math.floor(parseFloat(videoStream.duration));
            console.log("Duration from video stream:", streamDuration, "seconds");
            resolve(streamDuration);
          } else {
            console.warn("No duration found in metadata, defaulting to 0");
            resolve(0);
          }
        }
      } catch (parseError) {
        console.error("Error parsing metadata:", parseError);
        resolve(0);
      }
    });
  });
};