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
import { getWebPath, normalizeWebPath } from "../utils/path";
import { safeDeleteFile, getAbsolutePath } from "../utils/fileUtils";

/**
 * Normalize video object for response
 */
const normalizeVideo = (video: any) => {
  const obj = video.toObject ? video.toObject() : video;
  return {
    ...obj,
    filePath: obj.filePath ? normalizeWebPath(obj.filePath) : obj.filePath,
    thumbnailPath: obj.thumbnailPath ? normalizeWebPath(obj.thumbnailPath) : obj.thumbnailPath,
  };
};

/**
 * Upload and create a video
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
      thumbnailPath = getWebPath(thumbnailFile);

      try {
        const youtubeInfo = await getYouTubeVideoInfo(youtubeUrl);
        durationSeconds = youtubeInfo.duration;
        durationFormatted = formatDuration(durationSeconds);

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
      filePath = getWebPath(videoFile);

      if (!thumbnailFile) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ message: "Thumbnail file is required" });
      }
      thumbnailPath = getWebPath(thumbnailFile);

      try {
        durationSeconds = await getVideoDuration(videoFile.path);
        durationFormatted = formatDuration(durationSeconds);
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
      durationFormatted,
      category,
      subcategory: subcategory || undefined,
      artist: artist || undefined,
      views: 0,
      isPublished: true,
    });

    return res.status(httpStatus.CREATED).send(normalizeVideo(video));
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

    const normalized = videos.map((v) => normalizeVideo(v));
    return res.status(httpStatus.OK).send(normalized);
  } catch (error) {
    console.error("Error in getVideos:", error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching videos" });
  }
};

/**
 * Get video by id
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

    video.views += 1;
    await video.save();

    return res.status(httpStatus.OK).send(normalizeVideo(video));
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ message: "Error fetching video" });
  }
};

/**
 * Update video by id
 */
export const updateVideo = async (req: Request, res: Response) => {
  try {
    const { category, subcategory, platform, youtubeUrl, title, description } =
      req.body as any;

    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(httpStatus.BAD_REQUEST).send({
          message: "Invalid category ID. Category not found.",
        });
      }
    }

    if (subcategory) {
      const subCategoryDoc = await Subcategory.findById(subcategory);
      if (!subCategoryDoc) {
        return res.status(httpStatus.BAD_REQUEST).send({
          message: "Invalid subcategory ID. Subcategory not found.",
        });
      }
      if (category && String(subCategoryDoc.category) !== String(category)) {
        return res.status(httpStatus.BAD_REQUEST).send({
          message: "Subcategory does not belong to the specified category.",
        });
      }
    }

    const existing = await Video.findById(req.params.videoId);
    if (!existing) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Video not found" });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const videoFile = files?.video?.[0];
    const thumbnailFile = files?.thumbnail?.[0];

    const targetPlatform: "upload" | "youtube" =
      (platform as any) || existing.platform;

    let newFileName = existing.fileName;
    let newFilePath = existing.filePath;
    let newYoutubeUrl = existing.youtubeUrl;
    let newThumbnailPath = existing.thumbnailPath;
    let newDurationFormatted = existing.durationFormatted || "0:00";

    if (targetPlatform === "youtube") {
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
      if (youtubeUrl) newYoutubeUrl = youtubeUrl;

      try {
        const info = await getYouTubeVideoInfo(newYoutubeUrl!);
        newDurationFormatted = formatDuration(info.duration);
        if (!title && info.title) req.body.title = info.title;
        if (!description && info.description) {
          req.body.description = info.description.substring(0, 500);
        }
      } catch (e) {
        console.warn("Could not get YouTube video info:", e);
      }

      if (existing.platform === "upload") {
        if (existing.filePath) {
          safeDeleteFile(existing.filePath);
        }
        newFileName = undefined;
        newFilePath = undefined;
      }
    } else {
      if (existing.platform === "youtube" && !videoFile) {
        return res.status(httpStatus.BAD_REQUEST).send({
          message: "Video file is required when switching from YouTube to upload",
        });
      }
      if (videoFile) {
        if (existing.filePath) {
          safeDeleteFile(existing.filePath);
        }
        newFileName = videoFile.filename;
        newFilePath = getWebPath(videoFile);

        try {
          const seconds = await getVideoDuration(videoFile.path);
          newDurationFormatted = formatDuration(seconds);
        } catch (e) {
          console.warn("Could not get video duration:", e);
        }
      }
      if (existing.platform === "youtube" || platform === "upload") {
        newYoutubeUrl = undefined;
      }
    }

    if (thumbnailFile) {
      if (existing.thumbnailPath) {
        safeDeleteFile(existing.thumbnailPath);
      }
      newThumbnailPath = getWebPath(thumbnailFile);
    }

    if (typeof title !== "undefined") existing.title = title;
    if (typeof description !== "undefined") existing.description = description;
    if (typeof category !== "undefined") existing.category = category;
    if (typeof subcategory !== "undefined") existing.subcategory = subcategory || undefined;

    existing.platform = targetPlatform;
    existing.youtubeUrl = newYoutubeUrl;
    existing.fileName = newFileName;
    existing.filePath = newFilePath;
    existing.thumbnailPath = newThumbnailPath;
    existing.durationFormatted = newDurationFormatted;

    await existing.save();

    return res.status(httpStatus.OK).send(normalizeVideo(existing));
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
 */
export const deleteVideo = async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.videoId);

    if (!video) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Video not found" });
    }

    // Clean up files using cross-platform utilities
    if (video.platform === "upload" && video.filePath) {
      safeDeleteFile(video.filePath);
    }
    if (video.thumbnailPath) {
      safeDeleteFile(video.thumbnailPath);
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
 */
export const streamVideo = async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.videoId);

    if (!video) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Video not found" });
    }

    if (video.platform === "youtube") {
      return res.status(httpStatus.OK).send({
        platform: "youtube",
        youtubeUrl: video.youtubeUrl,
        embedUrl: video.youtubeUrl?.replace("watch?v=", "embed/"),
        message: "Use embedUrl for iframe embedding",
      });
    }

    if (!video.filePath) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ message: "Video file path not found" });
    }

    // Convert web path to absolute filesystem path
    const videoPath = getAbsolutePath(video.filePath);

    if (!fs.existsSync(videoPath)) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "Video file not found on disk" });
    }

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