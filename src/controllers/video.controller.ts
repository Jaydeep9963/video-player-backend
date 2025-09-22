import httpStatus from "http-status";
import { Request, Response } from "express";
import mongoose from "mongoose";
import fs from "fs";
import Video from "../models/video.model";
import { getVideoDuration } from "../utils/videoProcessor";
import {
  getYouTubeVideoInfo,
  isValidYouTubeUrl,
} from "../utils/youtubeProcessor";
import Category from "../models/category.model";
import Subcategory from "../models/subcategory.model";
import { formatDuration } from "../utils/formatDuration";

/**
 * Upload and create a video
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const uploadVideo = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      subcategory,
      artist,
      youtubeUrl,
      platform = "upload",
    } = req.body;

    let fileName: string | undefined;
    let filePath: string | undefined;
    let thumbnailPath: string;
    let durationSeconds = 0;
    let durationFormatted = "0:00";

    // ... category + subcategory validation stays same ...

    if (platform === "youtube") {
      if (!youtubeUrl || !isValidYouTubeUrl(youtubeUrl)) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Valid YouTube URL is required" });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const thumbnailFile = files?.thumbnail?.[0];
      if (!thumbnailFile) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Thumbnail file is required" });
      }
      thumbnailPath = thumbnailFile.path;

      try {
        const youtubeInfo = await getYouTubeVideoInfo(youtubeUrl);
        durationSeconds = youtubeInfo.duration;
        durationFormatted = formatDuration(durationSeconds); // ✅ store formatted

        if (!title && youtubeInfo.title) req.body.title = youtubeInfo.title;
        if (!description && youtubeInfo.description) {
          req.body.description = youtubeInfo.description.substring(0, 500);
        }
      } catch (error) {
        console.warn("Could not get YouTube video info:", error);
      }
    } else {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (!files?.video?.length) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "No video file uploaded" });
      }

      const videoFile = files.video[0];
      const thumbnailFile = files?.thumbnail?.[0];
      fileName = videoFile.filename;
      filePath = videoFile.path;

      if (!thumbnailFile) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Thumbnail file is required" });
      }
      thumbnailPath = thumbnailFile.path;

      try {
        durationSeconds = await getVideoDuration(filePath);
        durationFormatted = formatDuration(durationSeconds); // ✅ store formatted
      } catch (error) {
        console.warn("Could not get video duration:", error);
      }
    }

    const video = await Video.create({
      title,
      description,
      fileName,
      filePath,
      youtubeUrl: platform === "youtube" ? youtubeUrl : undefined,
      platform,
      thumbnailPath,
      durationFormatted, // ✅ save formatted only
      category,
      subcategory: subcategory || undefined,
      artist: artist || undefined,
      views: 0,
      isPublished: true,
    });

    return res.status(httpStatus.CREATED).send(video);
  } catch (error) {
    console.error("Video upload error:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: error.message });
    }
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error uploading video" });
  }
};

/**
 * Get all videos with filtering and pagination
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getVideos = async (req: Request, res: Response) => {
  try {
    const {
      category,
      subcategory,
      artist,
      platform,
      search,
      sortBy = "createdAt",
    } = req.query;

    const filter: any = { isPublished: true };
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (artist) filter.artist = artist;
    if (platform) filter.platform = platform;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const videos = await Video.find(filter, null, {
      sort: { [sortBy as string]: -1 },
    })
      .populate("category", "name")
      .populate("subcategory", "name")
      .populate("artist", "name");

    return res.status(httpStatus.OK).send(videos);
  } catch (error) {
    console.error("Error in getVideos:", error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching videos" });
  }
};


/**
 * Get video by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const getVideo = async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.videoId)
      .populate("category", "name")
      .populate("subcategory", "name")
      .populate("artist", "name");

    if (!video) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Video not found" });
    }

    // Increment view count
    video.views += 1;
    await video.save();

    // Add to watch history if user is authenticated
    // const userId = (req.user as any)?.id;
    // if (userId) {
    //   try {
    //     await WatchHistory.findOneAndUpdate(
    //       { user: userId, video: video._id },
    //       {
    //         watchedAt: new Date(),
    //         $setOnInsert: {
    //           watchDuration: 0,
    //           completed: false,
    //         },
    //       },
    //       {
    //         upsert: true,
    //         new: true,
    //         setDefaultsOnInsert: true,
    //       }
    //     );
    //   } catch (watchHistoryError) {
    //     // Don't fail the request if watch history update fails
    //     console.warn("Failed to update watch history:", watchHistoryError);
    //   }
    // }

    return res.status(httpStatus.OK).send(video);
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching video" });
  }
};

/**
 * Update video by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const updateVideo = async (req: Request, res: Response) => {
  try {
    const { category, subcategory, platform, youtubeUrl, title, description } =
      req.body as any;

    // Validate category exists (if provided)
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(httpStatus.BAD_REQUEST).send({
          message: "Invalid category ID. Category not found.",
        });
      }
    }

    // Validate subcategory exists and belongs to the category (if provided)
    if (subcategory) {
      const subCategoryDoc = await Subcategory.findById(subcategory);
      if (!subCategoryDoc) {
        return res.status(httpStatus.BAD_REQUEST).send({
          message: "Invalid subcategory ID. Subcategory not found.",
        });
      }

      // Check that subcategory belongs to the given category (if both provided)
      if (category && String(subCategoryDoc.category) !== String(category)) {
        return res.status(httpStatus.BAD_REQUEST).send({
          message: "Subcategory does not belong to the specified category.",
        });
      }
    }

    // Load existing video
    const existing = await Video.findById(req.params.videoId);
    if (!existing) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Video not found" });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const videoFile = files?.video?.[0];
    const thumbnailFile = files?.thumbnail?.[0];

    // Determine target platform
    const targetPlatform: "upload" | "youtube" = (platform as any) || existing.platform;

    // Prepare updates
    let newFileName = existing.fileName;
    let newFilePath = existing.filePath;
    let newYoutubeUrl = existing.youtubeUrl;
    let newThumbnailPath = existing.thumbnailPath;
    let newDurationFormatted = existing.durationFormatted || "0:00";

    // Handle platform-specific changes
    if (targetPlatform === "youtube") {
      // If switching to YouTube, require a valid URL
      if (youtubeUrl && !isValidYouTubeUrl(youtubeUrl)) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Valid YouTube URL is required" });
      }

      if (!existing.youtubeUrl && !youtubeUrl && existing.platform !== "youtube") {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "youtubeUrl is required when switching to YouTube" });
      }

      // Update URL if provided
      if (youtubeUrl) newYoutubeUrl = youtubeUrl;

      // Try to refresh duration and optionally title/description from YouTube API
      try {
        const info = await getYouTubeVideoInfo(newYoutubeUrl!);
        newDurationFormatted = formatDuration(info.duration);
        if (!title && info.title) req.body.title = info.title;
        if (!description && info.description) {
          req.body.description = info.description.substring(0, 500);
        }
      } catch (e) {
        // Non-blocking
        console.warn("Could not get YouTube video info:", e);
      }

      // Clear upload-specific fields when switching to YouTube
      if (existing.platform === "upload") {
        // Delete old uploaded file if present
        if (existing.filePath && fs.existsSync(existing.filePath)) {
          try {
            fs.unlinkSync(existing.filePath);
          } catch {}
        }
        newFileName = undefined;
        newFilePath = undefined;
      }
    } else {
      // targetPlatform === 'upload'
      if (existing.platform === "youtube" && !videoFile) {
        return res.status(httpStatus.BAD_REQUEST).send({
          message: "Video file is required when switching from YouTube to upload",
        });
      }

      if (videoFile) {
        // Replace old file if different
        if (existing.filePath && fs.existsSync(existing.filePath)) {
          try {
            fs.unlinkSync(existing.filePath);
          } catch {}
        }
        newFileName = videoFile.filename;
        newFilePath = videoFile.path;

        try {
          const seconds = await getVideoDuration(newFilePath);
          newDurationFormatted = formatDuration(seconds);
        } catch (e) {
          console.warn("Could not get video duration:", e);
        }
      }

      // Clear YouTube-specific fields when switching to upload
      if (existing.platform === "youtube" || platform === "upload") {
        newYoutubeUrl = undefined;
      }
    }

    // Thumbnail handling: optional for updates
    if (thumbnailFile) {
      // Delete previous thumbnail
      if (existing.thumbnailPath && fs.existsSync(existing.thumbnailPath)) {
        try {
          fs.unlinkSync(existing.thumbnailPath);
        } catch {}
      }
      newThumbnailPath = thumbnailFile.path;
    }

    // Apply simple field updates
    if (typeof title !== "undefined") existing.title = title;
    if (typeof description !== "undefined") existing.description = description;
    if (typeof category !== "undefined") existing.category = category;
    if (typeof subcategory !== "undefined") existing.subcategory = subcategory || undefined;

    // Apply computed updates
    existing.platform = targetPlatform;
    existing.youtubeUrl = newYoutubeUrl;
    existing.fileName = newFileName;
    existing.filePath = newFilePath;
    existing.thumbnailPath = newThumbnailPath;
    existing.durationFormatted = newDurationFormatted;

    await existing.save();

    return res.status(httpStatus.OK).send(existing);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: error.message });
    }
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error updating video" });
  }
};

/**
 * Delete video by id
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<Response>}
 */
export const deleteVideo = async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.videoId);

    if (!video) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Video not found" });
    }

    // Only delete files for uploaded videos, not YouTube videos
    if (video.platform === "upload") {
      // Delete video file
      if (video.filePath && fs.existsSync(video.filePath)) {
        fs.unlinkSync(video.filePath);
      }
    }

    // Delete thumbnail file (for both upload and YouTube)
    if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
      fs.unlinkSync(video.thumbnailPath);
    }

    await video.deleteOne();

    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    return res  
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error deleting video" });
  }
};

/**
 * Stream video
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const streamVideo = async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.videoId);

    if (!video) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Video not found" });
    }

    // For YouTube videos, return the YouTube URL for iframe embedding
    if (video.platform === "youtube") {
      return res.status(httpStatus.OK).send({
        platform: "youtube",
        youtubeUrl: video.youtubeUrl,
        embedUrl: video.youtubeUrl?.replace("watch?v=", "embed/"),
        message: "Use embedUrl for iframe embedding",
      });
    }

    // For uploaded videos, stream the file
    if (!video.filePath) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: "Video file path not found" });
    }

    const videoPath = video.filePath;
    const videoStat = fs.statSync(videoPath);
    const fileSize = videoStat.size;
    const videoRange = req.headers.range;

    if (videoRange) {
      const parts = videoRange.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      };

      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error streaming video" });
  }
};
